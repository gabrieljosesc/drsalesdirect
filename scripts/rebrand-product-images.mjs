/**
 * Replace watermarked product images with clean ones + the NEW logo.
 *
 * The catalog imported from the old WordPress site has the OLD Dr Sales Direct
 * logo baked into the product photos. The sibling Peak Medical / MedicaPlanet
 * catalogs hold the same products photographed WITHOUT any watermark, so for
 * every product we can confidently match we:
 *
 *   1. pull the clean source image,
 *   2. composite the CURRENT logo (public/logo.png) bottom-centre,
 *   3. upload it to our own storage and repoint product_images.
 *
 * Matching is deliberately strict — dosage/volume numbers are preserved, since
 * "1ml" vs "2x1ml" are different SKUs and showing the wrong photo on a medical
 * wholesale site is worse than showing a watermarked-but-correct one. Products
 * without a confident match keep their existing images.
 *
 * Run from drsalesdirect/:
 *   node scripts/rebrand-product-images.mjs --dry-run     # report coverage only
 *   node scripts/rebrand-product-images.mjs --limit=3     # try a few first
 *   node scripts/rebrand-product-images.mjs               # full run
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const self = dotenv.config({ path: path.join(ROOT, '.env.local'), override: true }).parsed

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const LIMIT = Number((args.find(a => a.startsWith('--limit=')) || '').split('=')[1] || 0)
const BUCKET = 'product-images'
// Filename similarity required. MedicaPlanet names its files after the product
// itself (REVOFIL-FINE-01.jpg), so a near-perfect name match is self-verifying
// — unlike a foreign DB's product->image mapping, which we found to be wrong
// for some products.
const MATCH_MIN = 0.9
const MAX_IMAGES = 4
const LOGO = path.join(ROOT, 'public', 'logo.png')
const MP_IMAGES = 'C:/Users/63950/Desktop/gabby/medicaplanet/web/public/images'

const norm = t => String(t || '').toLowerCase().replace(/[®™©]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
const toks = t => new Set(norm(t).split(' ').filter(w => w.length > 1))
const jac = (a, b) => { const i = [...a].filter(x => b.has(x)).length; const u = new Set([...a, ...b]).size; return u ? i / u : 0 }

/**
 * Prepare a clean product photo. Per the client, non-peptide categories carry
 * NO watermark (this script only processes non-peptides), so we just normalise
 * orientation, resize and re-encode.
 */
async function watermark(buf) {
  return sharp(buf).rotate().flatten({ background: '#ffffff' })
    .resize({ width: 1000, withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer()
}

/** Strip extension + trailing -01 index, and language/view noise words. */
function fileText(f) {
  return norm(f.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]\d{1,2}$/, ''))
    .replace(/\b(nonenglish|non english|english|turkish|korean|german|french|spanish|italian|russian|polish|danish|hero|front|back|side)\b/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

async function main() {
  if (!self?.NEXT_PUBLIC_SUPABASE_URL) { console.error('Missing drsalesdirect env'); process.exit(1) }
  if (!fs.existsSync(LOGO)) { console.error('Missing public/logo.png'); process.exit(1) }
  if (!fs.existsSync(MP_IMAGES)) { console.error('Missing MedicaPlanet image folder'); process.exit(1) }

  const D = createClient(self.NEXT_PUBLIC_SUPABASE_URL, self.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const publicBase = `${self.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`

  const { data: dProd } = await D.from('products').select('id,slug,title, category:categories(slug)')

  // Group MedicaPlanet files by their descriptive base name (SOMETHING-01/-02).
  const groups = new Map()
  for (const f of fs.readdirSync(MP_IMAGES).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))) {
    const key = fileText(f)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(f)
  }
  for (const list of groups.values()) list.sort((a, b) => a.localeCompare(b))
  const index = [...groups.entries()].map(([key, files]) => ({ key, files, t: toks(key) }))

  const targets = dProd.filter(d => d.category?.slug !== 'peptides')
  const jobs = []
  for (const d of targets) {
    const dt = toks(d.title)
    let best = null, bs = 0
    for (const x of index) { const s = jac(dt, x.t); if (s > bs) { bs = s; best = x } }
    if (best && bs >= MATCH_MIN) jobs.push({ d, files: best.files, score: bs })
  }

  console.log(`Products (non-peptide): ${targets.length}`)
  console.log(`MedicaPlanet image groups: ${index.length}`)
  console.log(`Confident filename matches (>=${MATCH_MIN}): ${jobs.length}`)
  console.log(`Keeping existing images: ${targets.length - jobs.length}\n`)

  if (DRY) {
    jobs.slice(0, 20).forEach(j => console.log(`  ${j.score.toFixed(2)}  ${j.d.title.slice(0, 42).padEnd(44)} <- ${j.files.join(', ').slice(0, 46)}`))
    console.log(`\n[dry-run] would rebrand ${jobs.length} products.`)
    return
  }

  const run = LIMIT ? jobs.slice(0, LIMIT) : jobs
  let done = 0, images = 0
  const failures = []

  for (const j of run) {
    const rows = []
    const files = j.files.slice(0, MAX_IMAGES)
    for (let i = 0; i < files.length; i++) {
      try {
        const buf = fs.readFileSync(path.join(MP_IMAGES, files[i]))
        const out = await watermark(buf)
        const key = `rebranded/${j.d.slug}-${i}.jpg`
        const { error } = await D.storage.from(BUCKET).upload(key, out, { contentType: 'image/jpeg', upsert: true })
        if (error) throw new Error(error.message)
        rows.push({ product_id: j.d.id, url: `${publicBase}/${key}`, sort_order: i })
        images++
      } catch (e) {
        failures.push(`${j.d.slug} [${i}]: ${e.message}`)
      }
    }
    if (rows.length) {
      await D.from('product_images').delete().eq('product_id', j.d.id)
      const { error } = await D.from('product_images').insert(rows)
      if (error) failures.push(`${j.d.slug} rows: ${error.message}`)
      else done++
    }
    if (done && done % 20 === 0) console.log(`  ${done}/${run.length} products …`)
  }

  console.log(`\nRebranded ${done} products, ${images} images.`)
  if (failures.length) {
    console.log(`\n⚠ ${failures.length} failures:`)
    failures.slice(0, 12).forEach(f => console.log('  -', f))
  }
}

main().catch(e => { console.error(e); process.exit(1) })
