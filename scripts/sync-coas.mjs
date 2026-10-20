/**
 * Rebuilds the product COA manifest from medicaplanet's authoritative
 * peptide-COA mapping, matched to CURRENT drsalesdirect slugs, and re-hosts
 * every PDF in THIS project's storage (bucket `product-coas`, public) so the
 * site no longer depends on medicaplanet's Supabase project.
 *
 * The old manifest was keyed by pre-import slugs, so products whose slugs
 * differ (dsip-10mg, mt-ii-…, retatrutide, …) silently lost their COA section.
 *
 * Run:  node scripts/sync-coas.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local'), override: true })

const DRY = process.argv.includes('--dry-run')
const MP_DATA = 'C:/Users/63950/Desktop/gabby/medicaplanet/web/data/peptide-coa.json'
const MP_FILES = 'C:/Users/63950/Desktop/gabby/medicaplanet/web/public/COA'
const BUCKET = 'product-coas'

const mp = JSON.parse(fs.readFileSync(MP_DATA, 'utf8'))
const entries = mp.entries ?? {}

// COA files that exist on disk but are missing from medicaplanet's mapping,
// keyed by CURRENT drsalesdirect slug. (mp's slugAliases are deliberately NOT
// used — they mapped dose variants onto each other, e.g. retatrutide->10mg.)
const EXTRA = {
  'mt-ii-melanotan-ii-10mg': [ // title: Melanotan I 10mg
    { label: 'Melanotan I 10mg (Novera)', file: '12737_NOVERA_COMPOUNDS_LLC_Melanotan_I_395249.pdf' },
    { label: 'Melanotan I 10mg (Novera)', file: '12738_NOVERA_COMPOUNDS_LLC_Melanotan_I_395130.pdf' },
  ],
  'foxo4-dri': [
    { label: 'FOXO4-DRI 10mg (Novera)', file: '12785_NOVERA_COMPOUNDS_LLC_FOX04-DRI_10mg.pdf' },
    { label: 'FOXO4-DRI 10mg (Novera)', file: '12786_NOVERA_COMPOUNDS_LLC_FOX04-DRI_10mg.pdf' },
  ],
  'retatrutide-60mg': [
    { label: 'Retatrutide 60mg (Novera)', file: '13004_NOVERA_COMPOUNDS_LLC_Retatrutide_60mg.pdf' },
  ],
  'tirzepatide-15mg': [
    { label: 'Tirzepatide 15mg (Novera)', file: '12564_NOVERA_COMPOUNDS_LLC_Tirzepatide_15mg.pdf' },
    { label: 'Tirzepatide 15mg — Endotoxin', file: 'Endotoxin_2354_NC_Tirzepatide_15mg.pdf' },
  ],
  'bpc-157-500mcg': [
    { label: 'BPC-157 500mcg (Novera)', file: '12875_NOVERA_COMPOUNDS_LLC_BPC-157_500mcg.pdf' },
  ],
  'epithalon-50mg': [
    { label: 'Epithalon 50mg — Endotoxin (batch EPI50A)', file: 'Endotoxin_2432_NC_Epithalon_EPI50A111425.pdf' },
  ],
  'tesofensine-500mcg': [
    { label: 'Tesofensine 500mcg (Novera)', file: '12901_NOVERA_COMPOUNDS_LLC_Tesofensine.pdf' },
    { label: 'Tesofensine 500mcg — Endotoxin', file: 'Endotoxin_2446_NC_Tesofensine_500mcg.pdf' },
  ],
}

// name+dose canon (same approach as the peptide import)
const doses = (s) => [...s.matchAll(/(\d+(?:\.\d+)?)\s*(mcg|mg)/gi)]
  .map((m) => parseFloat(m[1]) / (m[2].toLowerCase() === 'mcg' ? 1000 : 1))
  .sort((a, b) => a - b).join(',')
const nameKey = (s) => s.toLowerCase()
  .replace(/(\d+(?:\.\d+)?)\s*(mcg|mg)/gi, ' ')
  .replace(/[®™©"'’⁺()]/g, '').replace(/nad\+?/g, 'nad')
  .replace(/[+&:,––—-]/g, ' ')
  .replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2')
  .split(/\s+/).filter((t) => t && t !== 'blend' && t !== 'with').sort()
  .filter((t, i, a) => t !== a[i - 1]).join(' ')
const fullKey = (s) => `${nameKey(s)} | ${doses(s)}`

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`

const { data: cat } = await db.from('categories').select('id').eq('slug', 'peptides').single()
const { data: peptides } = await db.from('products')
  .select('slug, title').eq('category_id', cat.id).eq('is_active', true)

// index mp entry keys by canon for fallback matching
const mpByCanon = new Map()
for (const key of Object.keys(entries)) mpByCanon.set(fullKey(key.replaceAll('-', ' ')), key)

function rowsFor(drsSlug, drsTitle) {
  if (entries[drsSlug]?.length) return { rows: entries[drsSlug], via: drsSlug }
  const canonHit = mpByCanon.get(fullKey(drsTitle))
  if (canonHit && entries[canonHit]?.length) return { rows: entries[canonHit], via: canonHit }
  if (EXTRA[drsSlug]?.length) return { rows: EXTRA[drsSlug], via: 'extra' }
  return null
}

if (!DRY) {
  const { error } = await db.storage.createBucket(BUCKET, { public: true })
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message)
}

const manifest = {}
const noCoa = []
let uploaded = 0
for (const p of peptides.sort((a, b) => a.title.localeCompare(b.title))) {
  const hit = rowsFor(p.slug, p.title)
  if (!hit) { noCoa.push(p.title); continue }
  const { rows, via: mpKey } = hit
  const out = []
  for (const r of rows) {
    const local = path.join(MP_FILES, r.file)
    if (!fs.existsSync(local)) { console.log(`  ! missing file for ${p.slug}: ${r.file}`); continue }
    const keyPath = `${p.slug}/${r.file}`
    if (!DRY) {
      const { error } = await db.storage.from(BUCKET)
        .upload(keyPath, fs.readFileSync(local), { contentType: 'application/pdf', upsert: true })
      if (error) { console.log(`  ! upload ${keyPath}: ${error.message}`); continue }
      uploaded++
    }
    out.push({ label: r.label || p.title, url: `${publicBase}/${encodeURIComponent(p.slug)}/${encodeURIComponent(r.file)}` })
  }
  if (out.length) manifest[p.slug] = out
  console.log(`${out.length ? '✓' : '!'} ${p.title}  (${out.length} COAs${mpKey !== p.slug ? ` via ${mpKey}` : ''})`)
}

console.log(`\nproducts with COAs: ${Object.keys(manifest).length}/${peptides.length} | files uploaded: ${uploaded}`)
console.log('no COA on file:', noCoa.join(', ') || 'none')

if (!DRY) {
  fs.writeFileSync(path.join(ROOT, 'src/data/coa-manifest.json'), JSON.stringify(manifest, null, 1))
  console.log('\nwrote src/data/coa-manifest.json')
}
