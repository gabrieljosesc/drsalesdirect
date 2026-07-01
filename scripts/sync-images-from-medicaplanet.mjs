/**
 * Pull the EXACT image MedicaPlanet renders for each product and set it in
 * drsalesdirect. Catalog product slugs are identical across both sites
 * (slugify(title)+variantId), so we fetch medicaplanet.com/product/<slug>
 * and read the image it actually shows (/images/<file>), then point
 * drsalesdirect's product_images at https://medicaplanet.com/images/<file>.
 *
 * Peptides are skipped (their images come from purechainresearch.com).
 *
 * Run:  NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/sync-images-from-medicaplanet.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const BASE = 'https://medicaplanet.com'
const CONCURRENCY = 8

/** Extract all /images/<file> paths a product page renders, in DOM order, de-duped. */
function extractImagePaths(html) {
  const paths = []
  const seen = new Set()
  // Matches both /images/x.jpg and /_next/image?url=%2Fimages%2Fx.jpg
  const re = /(?:url=)?(%2[Ff]images%2[^"'&]+|\/images\/[^"'&?]+\.(?:jpg|jpeg|png|webp|gif))/gi
  let m
  while ((m = re.exec(html)) !== null) {
    let p
    try { p = decodeURIComponent(m[1]) } catch { continue } // skip malformed % sequences
    if (!p.startsWith('/images/')) continue
    if (!seen.has(p)) { seen.add(p); paths.push(p) }
  }
  return paths
}

async function fetchImagesForSlug(slug) {
  try {
    const res = await fetch(`${BASE}/product/${slug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return { status: res.status, images: [] }
    const html = await res.text()
    // The main product gallery is the FIRST run of /images/ refs.
    // Related-product images appear later; we keep only the hero (first) to be safe.
    const all = extractImagePaths(html)
    return { status: 200, images: all }
  } catch (e) {
    return { status: 0, error: String(e?.message || e), images: [] }
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('Missing env vars'); process.exit(1) }

  const sb = createClient(url, key, { auth: { persistSession: false } })

  // peptides category id (to skip)
  const { data: pepCat } = await sb.from('categories').select('id').eq('slug', 'peptides').single()
  const peptideCatId = pepCat?.id

  // all active products except peptides
  const { data: products, error } = await sb
    .from('products')
    .select('id, slug, category_id')
    .eq('is_active', true)
  if (error) { console.error(error.message); process.exit(1) }

  const targets = (products ?? []).filter(p => p.category_id !== peptideCatId)
  console.log(`Products to sync (non-peptide): ${targets.length}`)

  let done = 0, withImg = 0, noMatch = 0
  const unmatched = []

  // simple concurrency pool
  let idx = 0
  async function worker() {
    while (idx < targets.length) {
      const p = targets[idx++]
      const { status, images } = await fetchImagesForSlug(p.slug)
      done++

      if (images.length === 0) {
        noMatch++
        unmatched.push(`${p.slug} (http ${status})`)
      } else {
        const hero = `${BASE}${images[0]}`
        // replace hero (sort_order 0)
        await sb.from('product_images').delete().eq('product_id', p.id).eq('sort_order', 0)
        await sb.from('product_images').insert({ product_id: p.id, url: hero, sort_order: 0 })
        withImg++
      }

      if (done % 25 === 0) console.log(`  …${done}/${targets.length}  (images: ${withImg}, no match: ${noMatch})`)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`\nDone. ${withImg} products imaged, ${noMatch} without a MedicaPlanet image.`)
  if (unmatched.length) {
    console.log('\nNo image found for:')
    unmatched.slice(0, 40).forEach(s => console.log('  - ' + s))
    if (unmatched.length > 40) console.log(`  … and ${unmatched.length - 40} more`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
