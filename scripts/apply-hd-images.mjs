/**
 * Apply the client's HD product photos, replacing the old watermarked catalog
 * images. Each HD file is matched to a product by name (numbers preserved so
 * dosages never collapse), a SUBTLE new-logo watermark is composited in the
 * bottom-right corner, and product_images is repointed.
 *
 * Source folders: C:\Users\63950\hdimg\<category>\*.{jpg,png,webp,avif}
 * Filenames are product-named (PROLIA.png, OZEMPIC 1mg.png, 10.BPC 157 5mg.jpg).
 *
 * Run from drsalesdirect/:
 *   node scripts/apply-hd-images.mjs --dry-run     # print the file->product map
 *   node scripts/apply-hd-images.mjs --category=weight-loss
 *   node scripts/apply-hd-images.mjs               # all extracted categories
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

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const ONLY = (args.find(a => a.startsWith('--category=')) || '').split('=')[1] || null
const HD_ROOT = 'C:/Users/63950/hdimg'
const BUCKET = 'product-images'
const LOGO = path.join(ROOT, 'public', 'logo.png')
const MATCH_MIN = 0.6
const MAX_IMAGES = 5
const WM_OPACITY = 0.55
const WM_WIDTH_PCT = 0.20

const LANG = /\b(non english|nonenglish|english|turkish|korean|german|hungarian|japan|japanese|french|spanish|italian|russian|polish|danish|slovakian|slovak|default|persp|pack|injection|pen|kwikpen|flextouch|augentropfen|flakon|ql|iud)\b/g
const norm = t => String(t || '').toLowerCase().replace(/[®™©]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
// brand tokens: NOT starting with a digit, language/packaging noise removed.
// Single letters are kept — they distinguish variants like REJURAN I vs S.
const brand = t => new Set(norm(t).replace(LANG, ' ').split(' ').filter(w => w.length >= 1 && !/^\d/.test(w)))
// dosage fingerprint (decimals preserved): the numeric core of each dose, so a
// file's 0.25 never collapses into 0.5 or matches a bare "0".
const doses = t => new Set((String(t).toLowerCase().replace(/,/g, '.').match(/\d+(?:\.\d+)?\s*(?:mg|mcg|ml|iu|g|u)?/g) || [])
  .map(x => x.replace(/\s+/g, '').replace(/(mg|mcg|ml|iu|g|u)$/, ''))
  .filter(x => /\d/.test(x)))
const wordCount = t => norm(t).split(' ').filter(Boolean).length

/** filename -> product text: drop ext, leading "12." index, trailing "-01"
 *  photo index, and view/id noise. */
function fileText(f) {
  return f.replace(/\.[a-z0-9]+$/i, '').replace(/^\s*\d{1,3}[.\-_ ]+/, '')
    .replace(/[_-]persp.*$|[_-]default.*$|[_-]\d{6,}.*$/gi, '')
    .replace(/-\d{1,2}$/, '')
}

/**
 * Match a filename to a product. Filenames are authoritative (the client named
 * each file after the product), so we require the file's BRAND words to all be
 * present in the product title. Dosage only DISQUALIFIES a candidate on a real
 * conflict (file says 1mg, title says 0.5mg) — a dose-less title still matches a
 * dosed file. Ties prefer exact-dose then the primary (fewest-word) title.
 * Returns { product, ambiguous } or null.
 */
function matchFile(fname, idx) {
  const ft = fileText(fname)
  const fBrand = brand(ft)
  if (fBrand.size === 0) return null
  const fDose = doses(ft)

  const cands = []
  for (const x of idx) {
    if (![...fBrand].every(w => x.b.has(w))) continue      // every brand word must be in the title
    let doseScore
    if (fDose.size && x.d.size) {
      const share = [...fDose].some(d => x.d.has(d) || x.d.has(d.replace(/(mg|mcg|ml|iu|g|u)$/, '')))
      if (!share) continue                                 // genuine dose conflict -> reject
      doseScore = 2
    } else if (!fDose.size && !x.d.size) doseScore = 2      // both dose-less: tightest
    else doseScore = 1                                      // one side dose-less: allowed
    cands.push({ p: x.p, doseScore, extraBrand: x.b.size - fBrand.size, words: wordCount(x.p.title) })
  }
  if (cands.length === 0) return null
  cands.sort((a, b) => b.doseScore - a.doseScore || a.extraBrand - b.extraBrand || a.words - b.words)
  const top = cands[0], second = cands[1]
  const ambiguous = second && second.doseScore === top.doseScore && second.extraBrand === top.extraBrand && second.words === top.words
  return { product: top.p, ambiguous }
}

// Per the client, the logo watermark is applied to PEPTIDES ONLY; every other
// category is left clean.
const WATERMARK_CATEGORIES = new Set(['peptides'])

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
  const left = Math.max(0, iw - logoW - pad)
  const top = Math.max(0, ih - (lm.height || 0) - pad)
  return sharp(resized).composite([{ input: faded, left, top, blend: 'over' }]).jpeg({ quality: 88 }).toBuffer()
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('Missing Supabase env'); process.exit(1) }
  if (!fs.existsSync(LOGO)) { console.error('Missing public/logo.png'); process.exit(1) }
  const D = createClient(url, key, { auth: { persistSession: false } })
  const publicBase = `${url.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`

  const { data: prods } = await D.from('products').select('id,slug,title, category:categories(slug)')
  const idx = prods.map(p => ({ p, b: brand(p.title), d: doses(p.title) }))

  const cats = fs.readdirSync(HD_ROOT).filter(d => fs.statSync(path.join(HD_ROOT, d)).isDirectory())
    .filter(d => !ONLY || d === ONLY)

  const matches = [], unmatched = []
  for (const cat of cats) {
    const files = fs.readdirSync(path.join(HD_ROOT, cat)).filter(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f))
    for (const f of files) {
      const m = matchFile(f, idx)
      if (m && !m.ambiguous) matches.push({ cat, file: f, product: m.product })
      else unmatched.push({ cat, file: f, why: m?.ambiguous ? 'ambiguous: ' + m.product.title : 'no confident match' })
    }
  }

  // group files per product (language/angle variants become that product's set)
  const byProduct = new Map()
  for (const m of matches) {
    if (!byProduct.has(m.product.id)) byProduct.set(m.product.id, { product: m.product, files: [] })
    byProduct.get(m.product.id).files.push(m)
  }

  console.log(`Categories: ${cats.join(', ')}`)
  console.log(`HD files matched: ${matches.length} -> ${byProduct.size} products | needs review: ${unmatched.length}\n`)

  if (DRY) {
    for (const { product, files } of byProduct.values()) {
      console.log(`  ${product.title.slice(0, 42).padEnd(44)} <- ${files.map(f => f.file).join(', ').slice(0, 58)}`)
    }
    if (unmatched.length) {
      console.log('\nNEEDS REVIEW (kept as-is):')
      unmatched.forEach(u => console.log(`  ${u.cat}/${u.file}  (${u.why})`))
    }
    return
  }

  let done = 0, imgs = 0
  const failures = []
  for (const { product, files } of byProduct.values()) {
    const rows = []
    const wm = WATERMARK_CATEGORIES.has(product.category?.slug)
    const use = files.slice(0, MAX_IMAGES)
    for (let i = 0; i < use.length; i++) {
      try {
        const buf = fs.readFileSync(path.join(HD_ROOT, use[i].cat, use[i].file))
        const out = await processImage(buf, wm)
        const keyPath = `hd/${product.slug}-${i}.jpg`
        const { error } = await D.storage.from(BUCKET).upload(keyPath, out, { contentType: 'image/jpeg', upsert: true })
        if (error) throw new Error(error.message)
        rows.push({ product_id: product.id, url: `${publicBase}/${keyPath}`, sort_order: i })
        imgs++
      } catch (e) { failures.push(`${product.slug} [${i}]: ${e.message}`) }
    }
    if (rows.length) {
      await D.from('product_images').delete().eq('product_id', product.id)
      const { error } = await D.from('product_images').insert(rows)
      if (error) failures.push(`${product.slug} rows: ${error.message}`)
      else done++
    }
  }
  console.log(`Applied HD images to ${done} products, ${imgs} images.`)
  if (failures.length) { console.log(`\n⚠ ${failures.length} failures:`); failures.slice(0, 15).forEach(f => console.log('  -', f)) }
}

main().catch(e => { console.error(e); process.exit(1) })
