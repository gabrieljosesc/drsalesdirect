/**
 * Localize product images into our own Supabase Storage so the catalog no
 * longer depends on any third-party site.
 *
 * medicaplanet.com now returns 402, but medicaplanet's Supabase storage is
 * still public. We read medicaplanet's DB (exact image URLs) joined by product
 * slug, download the bytes, upload to OUR product-images bucket, and repoint
 * the row. Non-medicaplanet external hosts are downloaded from their URL.
 *
 * Products with no image in medicaplanet are reported (they need the old-WP
 * WooCommerce import as their source). Idempotent; ours (*.supabase.co) skipped.
 *
 * Usage:
 *   node scripts/localize-product-images.mjs --dry    # report recovery counts
 *   node scripts/localize-product-images.mjs          # full run
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pkEnv = dotenv.config({ path: path.join(__dirname, '..', '.env.local') }).parsed
const mpEnv = dotenv.config({ path: path.join(__dirname, '..', '..', 'medicaplanet', 'web', '.env.local') }).parsed

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] })
)
const LIMIT = args.limit ? parseInt(args.limit) : Infinity
const DRY = Boolean(args.dry)
const BUCKET = 'product-images'
const CONCURRENCY = 5

const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
function extFor(url, ct) {
  const t = (ct || '').split(';')[0].trim().toLowerCase()
  if (EXT_BY_TYPE[t]) return EXT_BY_TYPE[t]
  const m = url.split('?')[0].match(/\.(jpe?g|png|webp|gif)$/i)
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg'
}
async function tryFetch(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 100) return null
    return { buf, ct: res.headers.get('content-type') || 'image/jpeg' }
  } catch { return null }
}

async function main() {
  const PK = createClient(pkEnv.NEXT_PUBLIC_SUPABASE_URL, pkEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const MP = createClient(mpEnv.NEXT_PUBLIC_SUPABASE_URL, mpEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // medicaplanet: slug -> [image urls] (sorted)
  const [{ data: mpProds }, { data: mpImgs }] = await Promise.all([
    MP.from('products').select('id, slug'),
    MP.from('product_images').select('product_id, url, sort_order'),
  ])
  const mpSlugById = new Map((mpProds ?? []).map(p => [p.id, p.slug]))
  const mpBySlug = new Map()
  for (const im of (mpImgs ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    const slug = mpSlugById.get(im.product_id); if (!slug) continue
    if (!mpBySlug.has(slug)) mpBySlug.set(slug, [])
    mpBySlug.get(slug).push(im.url)
  }

  // drsalesdirect: external image rows + slug lookup
  const [{ data: pkImgs }, { data: pkProds }] = await Promise.all([
    PK.from('product_images').select('id, product_id, url, sort_order').order('sort_order'),
    PK.from('products').select('id, slug'),
  ])
  const pkSlugById = new Map((pkProds ?? []).map(p => [p.id, p.slug]))
  const external = (pkImgs ?? []).filter(r => { try { return !new URL(r.url).host.endsWith('.supabase.co') } catch { return false } })
  // track how many image rows we've consumed per product (to map to mp images in order)
  const seenForProduct = new Map()
  const targets = external.slice(0, LIMIT)
  console.log(`drsalesdirect external images: ${external.length} | this run: ${targets.length}${DRY ? ' (dry)' : ''}\n`)

  let ok = 0, noSource = 0
  const misses = []
  let idx = 0
  async function worker() {
    while (idx < targets.length) {
      const r = targets[idx++]
      const slug = pkSlugById.get(r.product_id)
      const host = (() => { try { return new URL(r.url).host } catch { return '' } })()

      const mpUrls = (slug && mpBySlug.get(slug)) || []
      const n = seenForProduct.get(r.product_id) ?? 0
      seenForProduct.set(r.product_id, n + 1)

      const candidates = []
      if (mpUrls.length) candidates.push(mpUrls[Math.min(n, mpUrls.length - 1)])
      if (host !== 'medicaplanet.com') candidates.push(r.url) // purechain etc: original may still work

      let got = null
      for (const c of candidates) { got = await tryFetch(c); if (got) break }
      if (!got) { noSource++; misses.push(slug || r.product_id); continue }

      if (!DRY) {
        const ext = extFor(candidates[0], got.ct)
        const objectPath = `${r.product_id}/${r.id}.${ext}`
        const up = await PK.storage.from(BUCKET).upload(objectPath, got.buf, { contentType: got.ct, upsert: true })
        if (up.error) { noSource++; misses.push(`${slug} upload:${up.error.message}`); continue }
        const pub = PK.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl
        const { error: ue } = await PK.from('product_images').update({ url: pub }).eq('id', r.id)
        if (ue) { noSource++; misses.push(`${slug} db:${ue.message}`); continue }
      }
      ok++
      if (ok % 25 === 0) console.log(`  …localized ${ok}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`\nDone. localized=${ok}, no-source(need old-WP import)=${noSource}`)
  if (misses.length) {
    const uniq = [...new Set(misses)]
    console.log(`\nNeed another source (${uniq.length} products), sample:`)
    uniq.slice(0, 25).forEach(m => console.log('  - ' + m))
  }
}
main().catch(e => { console.error(e); process.exit(1) })
