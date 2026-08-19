/**
 * One-way catalog sync: every product in peakmedical must exist in
 * drsalesdirect with the same price, tiers, and description.
 *
 * Same-product detection is deliberately variant-aware so that naming
 * differences do NOT create duplicates:
 *   - accents folded (JUVÉDERM ≡ JUVEDERM), ®/™ stripped
 *   - letter-digit boundaries split (RHA1 ≡ RHA 1, 100u ≡ 100 u)
 *   - "BI-SOFT" (Stylage tech suffix), "with/and/the", unit soup (u/units,
 *     vial/vials, syringes/pre-filled) treated as noise
 *   - dose fingerprints must agree (or one side carries none)
 * Language tokens (Czech/Korean/…) are IDENTITY — language packs are
 * genuinely separate SKUs in both stores.
 *
 * Matched pairs are reported (price/tier differences) but NOT overwritten.
 * Unmatched peak products are inserted with peak's exact data; images are
 * re-hosted from peak's storage into ours (peak/{slug}-N) as a fallback the
 * clean-source importers may later upgrade.
 *
 * Run:  node scripts/sync-from-peak.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

const peak = dotenv.config({ path: 'C:/Users/63950/Desktop/gabby/peakmedical/.env.local', override: true }).parsed
const self = dotenv.config({ path: '.env.local', override: true }).parsed

const DRY = process.argv.includes('--dry-run')
const BUCKET = 'product-images'
const MAX_IMAGES = 4

const fold = s => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
// tokens that never distinguish one SKU from another across the two stores:
// packaging words, form words, maker prefixes, marketing aliases. Language
// names are IDENTITY (language packs are separate SKUs) and stay.
const NOISE = new Set([
  'with', 'and', 'the', 'a', 'of', 'x', 'pcs', 'pack', 'pre', 'filled', 'syringes', 'syringe',
  'vial', 'vials', 'pen', 'kit', 'cream', 'cr', 'chemical', 'peel',
  // bare units — the NUMBER carries the identity, the unit never does
  'u', 'mg', 'ml', 'mcg', 'iu', 'ui', 'g', 'cc',
  'skinvive', 'wiqo', 'injection', 'gel', 'bio', 'revitalizing',
  // "English"/"Non-English" are default-market labels, not separate SKUs the
  // way Czech/Korean/... packs are; "alternative" stays identity.
  'english', 'non',
  'sesderma', 'mediderma', 'teoxane', 'galderma', 'merz', 'vivacy', 'croma', 'chroma', 'ibsa', 'mastelli',
])
function canon(title) {
  // strip marks BEFORE folding: NFKD decomposes ™ into the letters "tm"
  let t = fold(String(title || '').replace(/[®™©]/g, ' ')).toLowerCase()
    .replace(/\bbi[- ]?soft\b/g, ' ')       // Stylage tech suffix, not identity
    .replace(/\bunits?\b/g, 'u')             // 100 units ≡ 100u
    .replace(/[^a-z0-9.]+/g, ' ')
  t = t.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2')
  const words = t.split(/\s+/).filter(w => w && !NOISE.has(w))
  return words
}
const brandKey = title => [...new Set(canon(title).filter(w => !/^[\d.]/.test(w)))].sort().join(' ')
const doseSet = title => new Set((fold(title).toLowerCase().replace(/,/g, '.').match(/\d+(?:\.\d+)?/g) || []))
const doseKey = title => [...doseSet(title)].sort().join(' ')
const isSubset = (a, b) => [...a].every(x => b.has(x))

async function main() {
  const P = createClient(peak.NEXT_PUBLIC_SUPABASE_URL, peak.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const D = createClient(self.NEXT_PUBLIC_SUPABASE_URL, self.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const publicBase = `${self.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`

  const [{ data: pp }, { data: pImgs }, { data: dd }, { data: dCats }] = await Promise.all([
    P.from('products').select('id,slug,title,description,sku,base_price,price_tiers,currency,rating,review_count,is_active, category:categories(slug)'),
    P.from('product_images').select('product_id,url,sort_order'),
    D.from('products').select('id,slug,title,base_price,price_tiers'),
    D.from('categories').select('id,slug'),
  ])
  const catId = Object.fromEntries(dCats.map(c => [c.slug, c.id]))
  const imgsBy = new Map()
  for (const i of pImgs) { if (!imgsBy.has(i.product_id)) imgsBy.set(i.product_id, []); imgsBy.get(i.product_id).push(i) }
  for (const l of imgsBy.values()) l.sort((a, b) => a.sort_order - b.sort_order)

  // index drs by brandKey; each drs product can be claimed by ONE peak product
  const dIdx = new Map()
  for (const d of dd) {
    const bk = brandKey(d.title)
    if (!dIdx.has(bk)) dIdx.set(bk, [])
    dIdx.get(bk).push({ d, dose: doseSet(d.title), doseK: doseKey(d.title), claimed: false })
  }
  const pActive = pp.filter(p => p.is_active && (Number(p.base_price) > 0 || (p.price_tiers ?? []).length > 0))
  const pEntries = pActive.map(p => ({ p, bk: brandKey(p.title), dose: doseSet(p.title), doseK: doseKey(p.title), match: null }))
  const peakKeyCount = new Map()
  for (const e of pEntries) peakKeyCount.set(e.bk, (peakKeyCount.get(e.bk) ?? 0) + 1)
  const peakHasExact = new Set(pEntries.map(e => e.bk + '|' + e.doseK))

  // Pass 1: exact brand + exact dose
  for (const e of pEntries) {
    const c = (dIdx.get(e.bk) ?? []).find(c => !c.claimed && c.doseK === e.doseK)
    if (c) { c.claimed = true; e.match = c.d }
  }
  // Pass 2: exact brand + dose subset either way (both non-empty): 5x5g ≡ 5x5g 60ml
  for (const e of pEntries) {
    if (e.match || e.dose.size === 0) continue
    const c = (dIdx.get(e.bk) ?? []).find(c => !c.claimed && c.dose.size > 0 && (isSubset(e.dose, c.dose) || isSubset(c.dose, e.dose)))
    if (c) { c.claimed = true; e.match = c.d }
  }
  // Pass 3: exact brand, one side dose-less — only when the pairing is 1:1
  // (a dose-less catalog entry must not swallow several dosed variants)
  for (const e of pEntries) {
    if (e.match) continue
    if (peakKeyCount.get(e.bk) !== 1) continue
    const cands = (dIdx.get(e.bk) ?? []).filter(c => !c.claimed)
    if (cands.length !== 1) continue
    const c = cands[0]
    if (e.dose.size === 0 || c.dose.size === 0) { c.claimed = true; e.match = c.d }
  }
  // Pass 3b: dose-less drs entry vs several dosed peak variants — the drs one
  // IS the variant that shares its price (drs "BPC-157" $76 ≡ peak "BPC-157
  // 10mg" $76); remaining variants get added as their own SKUs.
  for (const e of pEntries) {
    if (e.match) continue
    const c = (dIdx.get(e.bk) ?? []).find(c => !c.claimed && c.dose.size === 0 && Number(c.d.base_price) === Number(e.p.base_price))
    if (c) { c.claimed = true; e.match = c.d }
  }
  // Pass 4: lidocaine boundary — one store names the plain product, the other
  // the lidocaine one, and neither store carries the counterpart itself
  const LIDO = ['lidocaine', 'mepivacaine']
  const stripLido = bk => bk.split(' ').filter(w => !LIDO.includes(w)).sort().join(' ')
  for (const e of pEntries) {
    if (e.match) continue
    const base = stripLido(e.bk)
    for (const [obk, cands] of dIdx) {
      if (stripLido(obk) !== base || obk === e.bk) continue
      // the counterpart key must not already exist on either side
      if (peakHasExact.has(obk + '|' + e.doseK)) continue
      const c = cands.find(c => !c.claimed && c.doseK === e.doseK)
      if (c) { c.claimed = true; e.match = c.d; break }
    }
  }

  const matched = pEntries.filter(e => e.match).map(e => ({ p: e.p, d: e.match }))

  // Missing = unmatched, minus peak-internal duplicates: peak itself carries
  // double rows like "STYLAGE® L" + "STYLAGE® L BI-SOFT®" (same SKU); only one
  // representative per (brand, dose) key may exist in drs afterwards.
  const takenKeys = new Set(dd.map(d => brandKey(d.title) + '|' + doseKey(d.title)))
  const missing = [], dupSkipped = []
  for (const e of pEntries) {
    if (e.match) continue
    const key = e.bk + '|' + e.doseK
    if (takenKeys.has(key)) { dupSkipped.push(e.p.title); continue }
    takenKeys.add(key)
    missing.push(e.p)
  }
  if (dupSkipped.length) {
    console.log(`peak-internal duplicates skipped (${dupSkipped.length}):`)
    dupSkipped.forEach(t => console.log('   ~', t))
    console.log('')
  }

  const priceDiff = matched.filter(({ p, d }) => Number(p.base_price) !== Number(d.base_price))
  const tierDiff = matched.filter(({ p, d }) => JSON.stringify(p.price_tiers ?? []) !== JSON.stringify(d.price_tiers ?? []))

  console.log(`peak active: ${pActive.length} | matched to drs: ${matched.length} | genuinely missing: ${missing.length}`)
  console.log(`matched-but-price-differs: ${priceDiff.length} | matched-but-tiers-differ: ${tierDiff.length}\n`)

  // persist the conflict report for the follow-up decision
  const report = ['PRICE/TIER DIFFERENCES (matched products, drs NOT overwritten)', '='.repeat(70)]
  for (const { p, d } of priceDiff) report.push(`$  ${p.title}  | peak $${p.base_price} vs drs $${d.base_price} ("${d.title}")`)
  for (const { p, d } of tierDiff) report.push(`~  ${p.title}  | tiers peak:${(p.price_tiers ?? []).length} vs drs:${(d.price_tiers ?? []).length}`)
  fs.writeFileSync('PEAK_SYNC_CONFLICTS.txt', report.join('\n'))

  if (DRY) {
    console.log('MISSING (would be added):')
    missing.forEach(p => console.log(`  [${p.category?.slug}] ${p.title}  $${p.base_price} tiers:${(p.price_tiers ?? []).length}`))
    return
  }

  // --sync-prices: make every matched drs product carry peak's exact price
  // and volume tiers (user-confirmed overwrite of the old-site pricing).
  if (process.argv.includes('--sync-prices')) {
    let updated = 0, same = 0
    for (const { p, d } of matched) {
      if (Number(p.base_price) === Number(d.base_price) &&
          JSON.stringify(p.price_tiers ?? []) === JSON.stringify(d.price_tiers ?? [])) { same++; continue }
      const { error } = await D.from('products')
        .update({ base_price: p.base_price, price_tiers: p.price_tiers ?? [] })
        .eq('id', d.id)
      if (error) console.log(`  ✗ ${d.title}: ${error.message}`)
      else updated++
    }
    console.log(`Price/tier sync: ${updated} updated, ${same} already identical.`)
    return
  }

  let added = 0, images = 0, skipped = 0
  const fails = []
  for (const p of missing) {
    const cat = catId[p.category?.slug] ?? catId['other']
    let slug = p.slug
    const record = {
      slug, title: p.title, description: p.description, sku: p.sku,
      base_price: p.base_price, price_tiers: p.price_tiers ?? [],
      currency: p.currency ?? 'USD', rating: p.rating ?? 4.5, review_count: p.review_count ?? 0,
      is_active: true, is_featured: false, category_id: cat,
    }
    let ins = await D.from('products').insert(record).select('id').single()
    if (ins.error?.code === '23505') {
      slug = `${p.slug}-pm`
      ins = await D.from('products').insert({ ...record, slug }).select('id').single()
    }
    if (ins.error || !ins.data) { skipped++; fails.push(`${p.slug}: ${ins.error?.message}`); continue }

    // re-host peak's images (fallback quality; clean importers may upgrade)
    const rows = []
    const srcs = (imgsBy.get(p.id) ?? []).slice(0, MAX_IMAGES)
    for (let i = 0; i < srcs.length; i++) {
      try {
        const r = await fetch(srcs[i].url)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const buf = Buffer.from(await r.arrayBuffer())
        const key = `peak/${slug}-${i}.jpg`
        const { error } = await D.storage.from(BUCKET).upload(key, buf, { contentType: r.headers.get('content-type') || 'image/jpeg', upsert: true })
        if (error) throw new Error(error.message)
        rows.push({ product_id: ins.data.id, url: `${publicBase}/${key}`, sort_order: i })
        images++
      } catch (e) { fails.push(`${slug} img${i}: ${e.message}`) }
    }
    if (rows.length) await D.from('product_images').insert(rows)
    added++
    if (added % 25 === 0) console.log(`  ${added}/${missing.length} …`)
  }

  console.log(`\nAdded ${added} products (${images} images re-hosted from peak), skipped ${skipped}.`)
  console.log('Price/tier conflicts for matched products written to PEAK_SYNC_CONFLICTS.txt (not applied).')
  if (fails.length) { console.log(`⚠ ${fails.length} warnings:`); fails.slice(0, 12).forEach(f => console.log('  -', f)) }
}

main().catch(e => { console.error(e); process.exit(1) })
