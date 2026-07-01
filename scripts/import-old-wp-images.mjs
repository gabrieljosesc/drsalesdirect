/**
 * Localize product images from the old WordPress site using a CSV exported
 * from its DB (columns: post_title, image_url, kind=featured|gallery).
 *
 * Matches each drsalesdirect product to an old-WP product by normalized title,
 * downloads the old static image files (they still serve), stores them in our
 * product-images bucket, and repoints the rows. Targets products whose images
 * are still external (dead medicaplanet) or that have no image.
 *
 * Usage:
 *   node scripts/import-old-wp-images.mjs --csv="C:/path/file.csv" --dry
 *   node scripts/import-old-wp-images.mjs --csv="C:/path/file.csv"
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true })

const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const CSV = args.csv || 'C:/Users/63950/Downloads/wp_actionscheduler_actions.csv'
const DRY = Boolean(args.dry)
const BUCKET = 'product-images'

const norm = t => String(t).toLowerCase().replace(/[®™]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')

// Base key: brand + strength, with language/variant/descriptor words removed,
// so "BOTOX® 100u (Polish)" and "BOTOX®100U Polish" collapse to "botox 100u".
const LANG = 'international english|english alternative|non english|nonenglish|english|korean|polish|czech|slovakian|slovak|greek|italian|german|dutch|turkish|romanian|hungarian|bulgarian|portuguese|spanish|french'
const DESC = 'bi soft|with lidocaine|lidocaine|inj|eye drops|1 vial|2 vials|vials|vial|units|unit'
function baseKey(t) {
  let x = String(t).toLowerCase().replace(/[®™]/g, ' ').replace(/\([^)]*\)/g, ' ')
  x = x.replace(/[^a-z0-9]+/g, ' ')                                   // hyphens/punct → space first
  x = x.replace(/(\d+)\s*u\b/g, '$1u').replace(/(\d+)\s*units?\b/g, '$1u')
  x = x.replace(new RegExp('\\b(' + LANG + ')\\b', 'g'), ' ')
  x = x.replace(new RegExp('\\b(' + DESC + ')\\b', 'g'), ' ')
  return x.trim().replace(/\s+/g, ' ')
}
const overlap = (a, b) => { const B = new Set(b.split(' ')); return a.split(' ').filter(w => B.has(w)).length }

function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') { if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = '' } }
    else cur += c
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }
  return rows
}

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // Build oldWP map: normTitle -> ordered image urls (featured first)
  const rows = parseCSV(fs.readFileSync(CSV, 'utf8'))
  const header = rows.shift()
  const ti = header.indexOf('post_title'), ui = header.indexOf('image_url'), ki = header.indexOf('kind')
  const byTitle = new Map(), byBase = new Map()
  for (const r of rows) {
    const title = r[ti], url = (r[ui] || '').replace(/^http:\/\//, 'https://'), kind = r[ki]
    if (!title || !url) continue
    const key = norm(title)
    if (!byTitle.has(key)) byTitle.set(key, { title, featured: [], gallery: [] })
    byTitle.get(key)[kind === 'featured' ? 'featured' : 'gallery'].push(url)
    const bk = baseKey(title)
    if (bk) { if (!byBase.has(bk)) byBase.set(bk, new Set()); byBase.get(bk).add(key) }
  }
  console.log(`old-WP products in CSV: ${byTitle.size}`)

  // Resolve a drsalesdirect title to an old-WP entry: exact norm, else best base match
  function resolve(pkTitle) {
    const exact = byTitle.get(norm(pkTitle))
    if (exact) return { entry: exact, how: 'exact' }
    const cands = byBase.get(baseKey(pkTitle))
    if (!cands || !cands.size) return null
    const pkN = norm(pkTitle)
    let best = null, bestScore = -1
    for (const k of cands) { const sc = overlap(pkN, k); if (sc > bestScore) { bestScore = sc; best = k } }
    return best ? { entry: byTitle.get(best), how: 'base' } : null
  }

  // drsalesdirect targets: external image (medicaplanet) or no image
  const [{ data: prods }, { data: imgs }] = await Promise.all([
    s.from('products').select('id, slug, title').eq('is_active', true),
    s.from('product_images').select('product_id, url'),
  ])
  const imgsByProd = new Map()
  for (const im of imgs) { if (!imgsByProd.has(im.product_id)) imgsByProd.set(im.product_id, []); imgsByProd.get(im.product_id).push(im.url) }
  const isExternal = u => { try { return !new URL(u).host.endsWith('.supabase.co') } catch { return false } }

  const targets = prods.filter(p => {
    const list = imgsByProd.get(p.id) || []
    return list.length === 0 || list.some(isExternal)
  })

  let matched = 0, fixed = 0, imgsStored = 0, baseMatches = 0
  const unmatched = []
  const sampleMaps = []
  for (const p of targets) {
    const res = resolve(p.title)
    if (!res) { unmatched.push(p.title); continue }
    matched++
    if (res.how === 'base') { baseMatches++; if (sampleMaps.length < 30) sampleMaps.push(`${p.title}  →  ${res.entry.title}`) }
    const hit = res.entry
    const urls = [...hit.featured, ...hit.gallery].filter((u, i, a) => a.indexOf(u) === i)
    if (DRY) { fixed++; imgsStored += urls.length; continue }

    const stored = []
    let i = 0
    for (const u of urls) {
      try {
        const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) })
        if (!r.ok) continue
        const buf = Buffer.from(await r.arrayBuffer()); if (buf.length < 100) continue
        const ct = r.headers.get('content-type') || 'image/jpeg'
        const objectPath = `${p.id}/${i}.jpg`
        const up = await s.storage.from(BUCKET).upload(objectPath, buf, { contentType: ct, upsert: true })
        if (up.error) continue
        stored.push(s.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl); i++
      } catch { /* skip */ }
    }
    if (stored.length) {
      await s.from('product_images').delete().eq('product_id', p.id)
      await s.from('product_images').insert(stored.map((url, idx) => ({ product_id: p.id, url, sort_order: idx })))
      fixed++; imgsStored += stored.length
      if (fixed % 25 === 0) console.log(`  …fixed ${fixed}`)
    }
  }

  console.log(`\nTargets (broken/no image): ${targets.length}`)
  console.log(`Matched: ${matched}  (exact: ${matched - baseMatches}, base/fuzzy: ${baseMatches})`)
  console.log(`${DRY ? 'Would fix' : 'Fixed'}: ${fixed} products, ${imgsStored} images`)
  console.log(`Unmatched (no old-WP source): ${unmatched.length}`)
  if (sampleMaps.length) { console.log('\nsample BASE/fuzzy mappings (sanity check):'); sampleMaps.forEach(m => console.log('  ' + m)) }
  if (unmatched.length) { console.log('\nstill unmatched:'); unmatched.slice(0, 30).forEach(t => console.log('  - ' + t)) }
}
main().catch(e => { console.error(e); process.exit(1) })
