/**
 * Folder-aware pass over the client's Dermatology package.
 *
 * The archive is organised as CATEGORY/BRAND/file, and the BRAND FOLDER name
 * carries identity that the filenames often omit ("TEOSYAL/RHA1.png",
 * "REVOLAX/SUB-Q with LIDOCAINE.jpg"). Identity for matching is therefore
 * tokens(brand folder) ∪ tokens(filename), with letter-digit splitting so
 * "RHA1" ≡ "RHA 1".
 *
 * Rules (same safety posture as the other importers):
 *  - every identity word of the product must appear in folder+file tokens;
 *  - the file may not add a meaningful identity word (different variant);
 *  - decimal-preserving dosage guard; ambiguous ties are skipped;
 *  - files with "watermark" in the name are ignored;
 *  - products already on client /hd/ images are left alone; everything else
 *    (old watermark, medicaplanet fill, no image) may be upgraded — client
 *    photos take priority over every other source;
 *  - output is CLEAN (no logo) — the watermark is for peptides only, and
 *    this package has no peptides.
 *
 * Run:  node scripts/apply-derm-folders.mjs [--dry-run]
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
const SRC = 'C:/Users/63950/Downloads/Product Photos Dermatology/Product Photos Dermatology'
const BUCKET = 'product-images'
const MAX_IMAGES = 4

const LANG = /\b(non english|nonenglish|english|turkish|korean|german|hungarian|japan|japanese|french|spanish|italian|russian|polish|danish|slovakian|slovak|portuguese|romanian|greek|dutch|default|persp|pack|kwikpen|flextouch|augentropfen|flakon|ql|iud|side|front|back|angled|shomp|opt|min)\b/g
const MAKER = /\b(merz|galderma|teoxane|chroma|croma|sanofi|abbvie|allergan|ibsa|sinclair|mastelli|novo|nordisk|pfizer|amgen|vivacy|mesoestetic|moryskin|lavigor)\b/g
const NOISE = new Set(('bisoft biphasic lidocaine lidocaina lido complement resize view powder mist retouch alternative vial vials pcs pack ml mg cc with and the for un a of x ' +
  'new health supplies ' +
  'cream creams serum gel mask masks masque solution fluid cleanser lotion spray drop drops injection filler face facial skin body hydrating moisturizing product image png jpg still').split(/\s+/).filter(Boolean))

// letter<->digit boundary split so RHA1 -> rha 1, UltraCol200 -> ultracol 200
const splitLD = s => s.replace(/([a-z])(\d)/gi, '$1 $2').replace(/(\d)([a-z])/gi, '$1 $2')
const norm = t => splitLD(String(t || '').toLowerCase().replace(/[®™©]/g, '').replace(/[^a-z0-9.]+/g, ' ')).replace(/\s+/g, ' ').trim()
const brandToks = t => new Set(norm(t).replace(LANG, ' ').replace(MAKER, ' ').split(' ').filter(w => w.length >= 1 && !/^[\d.]/.test(w)))
const doses = t => new Set((String(t).toLowerCase().replace(/,/g, '.').match(/\d+(?:\.\d+)?\s*(?:mg|mcg|ml|iu|g|u|cc)?/g) || [])
  .map(x => x.replace(/\s+/g, '').replace(/(mg|mcg|ml|iu|g|u|cc)$/, '')).filter(x => /\d/.test(x)))

function fileBase(f) {
  return f.replace(/\.[a-z0-9]+$/i, '').replace(/^\s*\d{1,3}[.\-_ ]+/, '').replace(/-\d{1,2}$/, '')
}

async function clean(buf) {
  return sharp(buf).rotate().flatten({ background: '#ffffff' })
    .resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(jpg|jpeg|png|webp|avif)$/i.test(e.name) && !/watermark/i.test(e.name)) out.push(p)
  }
  return out
}

async function main() {
  const D = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`

  const { data: prods } = await D.from('products').select('id,slug,title, category:categories(slug)').eq('is_active', true)
  const { data: imgs } = await D.from('product_images').select('product_id,url')
  const first = new Map()
  for (const i of imgs) if (!first.has(i.product_id)) first.set(i.product_id, i.url)

  // targets: anything not already on client /hd/ images, excluding peptides
  const targets = prods.filter(p => p.category?.slug !== 'peptides' && !(first.get(p.id) || '').includes('/hd/'))

  // index files: containment may use folder + filename tokens, but only
  // FILE tokens can disqualify as "extra" (folders are context, and files are
  // sometimes misfiled under a sibling brand's folder)
  const files = walk(SRC).map(f => {
    const folder = path.basename(path.dirname(f))
    const fileB = brandToks(fileBase(path.basename(f)))
    const b = new Set([...brandToks(folder), ...fileB])
    const d = doses(fileBase(path.basename(f)))
    return { f, folder, b, fileB, d }
  })

  const jobs = []
  for (const p of targets) {
    const pB = brandToks(p.title), pD = doses(p.title)
    const pCore = new Set([...pB].filter(w => !NOISE.has(w)))
    if (pCore.size === 0) continue
    const cands = []
    for (const x of files) {
      if (![...pCore].every(w => x.b.has(w))) continue
      const extra = [...x.fileB].filter(w => !pB.has(w) && !NOISE.has(w))
      if (extra.length) continue
      let doseScore
      if (pD.size && x.d.size) {
        // every dose in the product must appear in the file (2x1ml != 1x3ml)
        if (![...pD].every(d => x.d.has(d))) continue
        doseScore = 2
      } else if (!pD.size && !x.d.size) doseScore = 2
      else doseScore = 1
      cands.push({ x, doseScore, extraCt: x.fileB.size - pCore.size })
    }
    if (!cands.length) continue
    cands.sort((a, b) => b.doseScore - a.doseScore || a.extraCt - b.extraCt)
    // gather all files tied at the top rank as the product's image set
    const top = cands[0]
    const set = cands.filter(c => c.doseScore === top.doseScore && c.extraCt === top.extraCt).map(c => c.x.f)
    jobs.push({ p, files: [...new Set(set)].sort() })
  }

  console.log(`Targets (not on client HD): ${targets.length}`)
  console.log(`Folder-aware matches: ${jobs.length}\n`)
  if (DRY) {
    jobs.forEach(j => console.log(`  ${j.p.title.slice(0, 44).padEnd(46)} <- ${j.files.map(f => path.basename(path.dirname(f)) + '/' + path.basename(f)).join(', ').slice(0, 80)}`))
    return
  }

  let done = 0, images = 0
  const fails = []
  for (const j of jobs) {
    const rows = []
    const use = j.files.slice(0, MAX_IMAGES)
    for (let i = 0; i < use.length; i++) {
      try {
        const out = await clean(fs.readFileSync(use[i]))
        const key = `hd/${j.p.slug}-${i}.jpg`
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
    if (done && done % 20 === 0) console.log(`  ${done}/${jobs.length} …`)
  }
  console.log(`\nApplied ${done} products, ${images} images.`)
  if (fails.length) { console.log(`⚠ ${fails.length} failures:`); fails.slice(0, 12).forEach(f => console.log('  -', f)) }
}

main().catch(e => { console.error(e); process.exit(1) })
