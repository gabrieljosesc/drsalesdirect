/**
 * Fill the remaining old-watermarked / imageless products from EVERY available
 * clean image source, matching by product name.
 *
 * Unlike apply-hd-images (which required filename ⊆ title), the MedicaPlanet
 * library names files with a manufacturer prefix (MERZ-RADIESSE-2X1.5CC), so
 * here we require the PRODUCT'S brand words ⊆ the FILENAME, with a dosage guard
 * (decimals preserved) so 1.5ml never lands on 3.0. Only products that still
 * show the old watermark (or have no image) are touched; anything already on a
 * client HD photo is left alone. Watermark on peptides only.
 *
 * Sources scanned (recursively):
 *   ../medicaplanet/web/public/images
 *   C:\Users\63950\Downloads\product_images
 *   C:\Users\63950\hdimg
 *
 * Run from drsalesdirect/:
 *   node scripts/fill-remaining-images.mjs --dry-run
 *   node scripts/fill-remaining-images.mjs
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local'), override: true })

const DRY = process.argv.includes('--dry-run')
const BUCKET = 'product-images'
const LOGO = path.join(ROOT, 'public', 'logo.png')
const MAX_IMAGES = 4
const WM_OPACITY = 0.55
const WM_WIDTH_PCT = 0.20
const WATERMARK_CATEGORIES = new Set(['peptides'])
const SOURCES = [
  'C:/Users/63950/Desktop/gabby/medicaplanet/web/public/images',
  'C:/Users/63950/Downloads/product_images',
  'C:/Users/63950/hdimg',
]

const LANG = /\b(non english|nonenglish|english|turkish|korean|german|hungarian|japan|japanese|french|spanish|italian|russian|polish|danish|slovakian|slovak|portuguese|romanian|greek|dutch|default|persp|pack|injection|pen|kwikpen|flextouch|augentropfen|flakon|ql|iud|retouch|alternative|vial|vials)\b/g
// common manufacturer prefixes that appear in filenames but not product titles
const MAKER = /\b(merz|galderma|teoxane|chroma|croma|sanofi|abbvie|allergan|ibsa|sinclair|mastelli|novo|nordisk|pfizer|amgen|bms|abbott|roche|vivacy|mesoestetic)\b/g
// packaging / formulation words in a filename that do NOT change product identity.
// Any OTHER extra word in the file (e.g. PLUS, KISS, HYDRO) means a different
// product, so the match is rejected.
const NOISE = new Set(('bisoft biphasic soft lidocaine lidocaina complement resize front back side view powder mist retouch alternative default persp box vial vials pcs pack ml mg mine cc with and the for un a of new daily care ' +
  // generic dosage form words: present in a product title but often omitted from
  // the filename (or vice-versa); they describe the form, not the identity
  'cream creams serum gel mask masks masque solution fluid cleanser lotion spray drop drops injection filler face facial skin body hydrating moisturizing').split(/\s+/).filter(Boolean))
const norm = t => String(t || '').toLowerCase().replace(/[®™©]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
const brand = t => new Set(norm(t).replace(LANG, ' ').split(' ').filter(w => w.length >= 1 && !/^\d/.test(w)))
const doses = t => new Set((String(t).toLowerCase().replace(/,/g, '.').match(/\d+(?:\.\d+)?\s*(?:mg|mcg|ml|iu|g|u|cc)?/g) || [])
  .map(x => x.replace(/\s+/g, '').replace(/(mg|mcg|ml|iu|g|u|cc)$/, '')).filter(x => /\d/.test(x)))
const wordCount = t => norm(t).split(' ').filter(Boolean).length

function fileBase(f) {
  return f.replace(/\.[a-z0-9]+$/i, '').replace(/^\s*\d{1,3}[.\-_ ]+/, '')
    .replace(/[_-]persp.*$|[_-]default.*$|[_-]\d{6,}.*$/gi, '').replace(/-\d{1,2}$/, '')
}
// filename brand tokens (drop maker prefixes so they neither help nor block)
const fileBrand = f => new Set(norm(fileBase(f)).replace(LANG, ' ').replace(MAKER, ' ').split(' ').filter(w => w.length >= 1 && !/^\d/.test(w)))

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(jpg|jpeg|png|webp|avif)$/i.test(e.name)) out.push(p)
  }
  return out
}

async function processImage(buf, watermark) {
  const base = sharp(buf).rotate().flatten({ background: '#ffffff' })
  const meta = await base.metadata()
  const W = Math.min(meta.width || 1000, 1100)
  const resized = await base.resize({ width: W, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
  if (!watermark) return resized
  const m2 = await sharp(resized).metadata()
  const iw = m2.width || W, ih = m2.height || W
  const logoW = Math.round(iw * WM_WIDTH_PCT)
  const logo = await sharp(LOGO).resize({ width: logoW }).ensureAlpha().toBuffer()
  const lm = await sharp(logo).metadata()
  const faded = await sharp(logo)
    .composite([{ input: Buffer.from([255, 255, 255, Math.round(255 * WM_OPACITY)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in' }])
    .png().toBuffer()
  const pad = Math.round(iw * 0.025)
  return sharp(resized).composite([{ input: faded, left: Math.max(0, iw - logoW - pad), top: Math.max(0, ih - (lm.height || 0) - pad), blend: 'over' }]).jpeg({ quality: 88 }).toBuffer()
}

async function main() {
  const D = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`

  const { data: prods } = await D.from('products').select('id,slug,title, category:categories(slug)').eq('is_active', true)
  const { data: imgs } = await D.from('product_images').select('product_id,url')
  const firstImg = new Map()
  for (const i of imgs) if (!firstImg.has(i.product_id)) firstImg.set(i.product_id, i.url)

  // targets: still on old watermark, or no image (never touch client HD / clean / peptide)
  const targets = prods.filter(p => {
    const u = firstImg.get(p.id) || ''
    return !u || (!u.includes('/hd/') && !u.includes('/rebranded/') && !u.includes('/fill/') && !u.includes('purechain'))
  })

  // index all source files, grouped by descriptive base name
  const groups = new Map()
  for (const root of SOURCES) {
    for (const f of walk(root)) {
      const key = norm(fileBase(path.basename(f)))
      if (!key) continue
      if (!groups.has(key)) groups.set(key, { files: [], b: fileBrand(path.basename(f)), d: doses(path.basename(f)) })
      groups.get(key).files.push(f)
    }
  }
  const index = [...groups.values()]

  const jobs = []
  for (const p of targets) {
    const pB = brand(p.title), pD = doses(p.title)
    const pCore = new Set([...pB].filter(w => !NOISE.has(w)))   // identity words only
    if (pCore.size === 0) continue
    const cands = []
    for (const g of index) {
      if (![...pCore].every(w => g.b.has(w))) continue          // product identity ⊆ filename
      // and the filename must not add a MEANINGFUL (identity) word => different variant
      const extraMeaningful = [...g.b].filter(w => !pB.has(w) && !NOISE.has(w) && !/^\d/.test(w))
      if (extraMeaningful.length) continue
      let doseScore
      if (pD.size && g.d.size) {
        if (![...pD].some(d => g.d.has(d))) continue          // dose conflict
        doseScore = 2
      } else if (!pD.size && !g.d.size) doseScore = 2
      else doseScore = 1
      cands.push({ g, doseScore, extra: g.b.size - pB.size })
    }
    if (!cands.length) continue
    cands.sort((a, b) => b.doseScore - a.doseScore || a.extra - b.extra)
    const top = cands[0], second = cands[1]
    const ambiguous = second && second.doseScore === top.doseScore && second.extra === top.extra
    if (!ambiguous) jobs.push({ p, files: top.g.files.slice().sort((a, b) => a.localeCompare(b)) })
  }

  console.log(`Targets (old-watermark / no image): ${targets.length}`)
  console.log(`Filled from clean sources: ${jobs.length}`)

  if (DRY) {
    jobs.forEach(j => console.log(`  ${j.p.title.slice(0, 44).padEnd(46)} <- ${path.basename(j.files[0])}`))
    return
  }

  let done = 0, images = 0
  const fails = []
  for (const j of jobs) {
    const wm = WATERMARK_CATEGORIES.has(j.p.category?.slug)
    const rows = []
    const files = j.files.slice(0, MAX_IMAGES)
    for (let i = 0; i < files.length; i++) {
      try {
        const out = await processImage(fs.readFileSync(files[i]), wm)
        const key = `fill/${j.p.slug}-${i}.jpg`
        const { error } = await D.storage.from(BUCKET).upload(key, out, { contentType: 'image/jpeg', upsert: true })
        if (error) throw new Error(error.message)
        rows.push({ product_id: j.p.id, url: `${publicBase}/${key}`, sort_order: i })
        images++
      } catch (e) { fails.push(`${j.p.slug}[${i}]: ${e.message}`) }
    }
    if (rows.length) {
      await D.from('product_images').delete().eq('product_id', j.p.id)
      const { error } = await D.from('product_images').insert(rows)
      if (error) fails.push(`${j.p.slug} rows: ${error.message}`)
      else done++
    }
    if (done && done % 25 === 0) console.log(`  ${done}/${jobs.length} …`)
  }
  console.log(`\nFilled ${done} products, ${images} images.`)
  if (fails.length) { console.log(`⚠ ${fails.length} failures:`); fails.slice(0, 12).forEach(f => console.log('  -', f)) }
}

main().catch(e => { console.error(e); process.exit(1) })
