/**
 * Sync the Peptides category to Michael's authoritative "Peptides Full List"
 * spreadsheet (exported to JSON: [{name, sku, price, description}]).
 *
 *  - Matched existing products get the list's name, SKU, price, description
 *    (images are kept; new HD images arrive separately).
 *  - List rows with no match are inserted (imageless until images arrive).
 *  - Existing active peptides NOT on the list are deactivated (reported).
 *  - is_dose_primary is recomputed across all active peptides so each
 *    multi-strength family (mg or mcg) shows one card, lowest strength first.
 *
 * Run:  node scripts/import-peptides-xlsx.mjs <list.json> [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local', override: true })
const DRY = process.argv.includes('--dry-run')
const listPath = process.argv[2]
if (!listPath || !fs.existsSync(listPath)) {
  console.error('usage: node scripts/import-peptides-xlsx.mjs <list.json> [--dry-run]')
  process.exit(1)
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

/** Dose fingerprint: every "<n>mg" / "<n>mcg" in the name, mg-equivalent values. */
function doses(name) {
  return [...name.matchAll(/(\d+(?:\.\d+)?)\s*(mcg|mg)/gi)]
    .map(m => parseFloat(m[1]) / (m[2].toLowerCase() === 'mcg' ? 1000 : 1))
    .sort((a, b) => a - b)
}

/** Name key with doses removed: lowercased, symbol-folded, boundary-split tokens. */
function nameKey(name) {
  return name
    .toLowerCase()
    .replace(/(\d+(?:\.\d+)?)\s*(mcg|mg)/gi, ' ')       // doses tracked separately
    .replace(/[®™©"'’⁺()]/g, '')
    .replace(/nad\+?/g, 'nad')
    .replace(/[+&:,––—-]/g, ' ')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .split(/\s+/)
    .filter(t => t && t !== 'blend' && t !== 'with')
    .sort()
    .filter((t, i, a) => t !== a[i - 1]) // legacy titles repeat tokens ("Cagrilintide & Cagrilintide+…")
    .join(' ')
}

const fullKey = name => `${nameKey(name)} | ${doses(name).join(',')}`
/** Legacy titles often dropped the dose but kept it in the slug ("Epithalon" / epithalon-10mg). */
const productFullKey = p => {
  const d = doses(p.title).length ? doses(p.title) : doses(p.slug.replaceAll('-', ' '))
  return `${nameKey(p.title)} | ${d.join(',')}`
}
const cleanTitle = name => name.replace(/"/g, '').replace(/\s+/g, ' ').trim()
const slugify = name => cleanTitle(name).toLowerCase()
  .replace(/[⁺+]/g, ' plus ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const { data: cat } = await db.from('categories').select('id').eq('slug', 'peptides').single()
const { data: existing } = await db.from('products')
  .select('id, slug, title, sku, base_price, is_active')
  .eq('category_id', cat.id)
const { data: allSlugs } = await db.from('products').select('slug')
const slugTaken = new Set((allSlugs ?? []).map(r => r.slug))

const list = JSON.parse(fs.readFileSync(listPath, 'utf8'))

// Pass 1: exact (name + dose) key. Pass 2: name-only key, when unique on both sides.
const byFull = new Map(), byName = new Map()
for (const p of existing) {
  const fk = productFullKey(p); const nk = nameKey(p.title)
  byFull.set(fk, [...(byFull.get(fk) ?? []), p])
  byName.set(nk, [...(byName.get(nk) ?? []), p])
}
const claimed = new Set()
const matches = [] // {row, product}
const inserts = []
for (const row of list) {
  const fk = fullKey(row.name)
  let cands = (byFull.get(fk) ?? []).filter(p => !claimed.has(p.id))
  if (cands.length === 0) {
    const nk = nameKey(row.name)
    const nameCands = (byName.get(nk) ?? []).filter(p => !claimed.has(p.id))
    const listSameName = list.filter(r => nameKey(r.name) === nk)
    if (nameCands.length === 1 && listSameName.length === 1) cands = nameCands
  }
  if (cands.length > 0) { claimed.add(cands[0].id); matches.push({ row, product: cands[0] }) }
  else inserts.push(row)
}
const leftovers = existing.filter(p => p.is_active && !claimed.has(p.id))

console.log(`list rows: ${list.length} | matched: ${matches.length} | new: ${inserts.length} | existing actives not on list: ${leftovers.length}`)

for (const { row, product } of matches) {
  const t = cleanTitle(row.name)
  const priceChanged = Number(product.base_price) !== row.price
  if (t !== product.title || priceChanged)
    console.log(`  ~ ${product.title} ($${product.base_price}) -> ${t} ($${row.price})`)
}
console.log('\nNEW (no images yet — awaiting Michael\'s files):')
inserts.forEach(r => console.log(`  + ${cleanTitle(r.name)} ($${r.price}) [${r.sku}]`))
if (leftovers.length) {
  console.log('\nDEACTIVATING (active but not on the full list):')
  leftovers.forEach(p => console.log(`  - ${p.title} (${p.slug})`))
}

if (DRY) { console.log('\n(dry run — nothing written)'); process.exit(0) }

const usedSkus = new Set(existing.map(p => p.sku))
for (const { row, product } of matches) {
  const upd = {
    title: cleanTitle(row.name),
    base_price: row.price,
    description: row.description ?? undefined,
    is_active: true,
  }
  if (row.sku && !usedSkus.has(row.sku)) { upd.sku = row.sku; usedSkus.add(row.sku) }
  const { error } = await db.from('products').update(upd).eq('id', product.id)
  if (error) console.log('  update failed:', product.slug, error.message)
}

for (const row of inserts) {
  const title = cleanTitle(row.name)
  let slug = slugify(row.name)
  while (slugTaken.has(slug)) slug += '-pep'
  slugTaken.add(slug)
  let sku = row.sku && !usedSkus.has(row.sku) ? row.sku : `PEP-${slug}`
  usedSkus.add(sku)
  const { error } = await db.from('products').insert({
    slug, title, sku,
    description: row.description ?? null,
    base_price: row.price,
    price_tiers: [],
    currency: 'USD',
    is_active: true,
    is_featured: false,
    category_id: cat.id,
  })
  if (error) console.log('  insert failed:', slug, error.message)
}

if (leftovers.length) {
  const { error } = await db.from('products')
    .update({ is_active: false })
    .in('id', leftovers.map(p => p.id))
  if (error) console.log('  deactivate failed:', error.message)
}

// Recompute one-card-per-family flags (mg and mcg, lowest strength = primary)
const { data: refreshed } = await db.from('products')
  .select('id, title')
  .eq('category_id', cat.id)
  .eq('is_active', true)
const fams = new Map()
for (const p of refreshed) {
  if (p.title.includes('+')) continue
  const d = doses(p.title)
  if (d.length !== 1) continue
  const nk = nameKey(p.title)
  fams.set(nk, [...(fams.get(nk) ?? []), { id: p.id, dose: d[0] }])
}
const demote = []
for (const members of fams.values()) {
  if (members.length < 2) continue
  members.sort((a, b) => a.dose - b.dose)
  demote.push(...members.slice(1).map(m => m.id))
}
await db.from('products').update({ is_dose_primary: true }).eq('category_id', cat.id)
if (demote.length) await db.from('products').update({ is_dose_primary: false }).in('id', demote)
console.log(`\nDone. Dose families collapsed: ${[...fams.values()].filter(m => m.length > 1).length} (${demote.length} strengths folded into their family card)`)
