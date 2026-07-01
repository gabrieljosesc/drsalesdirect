/**
 * Rebuild peptides to EXACTLY mirror MedicaPlanet's catalog, priced from
 * purechainresearch.com.
 *
 * Why: the docx ("Peptides description v2.docx") contains extra compounds
 * (Russian bioregulators, etc.) that MedicaPlanet does NOT actually sell
 * (confirmed against medicaplanet.com/peptides). This script makes the
 * peptide catalog authoritative:
 *   - Upserts ONLY MedicaPlanet's real peptides (canonical slugs)
 *   - Prices each from the live PureChainResearch store (dose-matched)
 *   - Deletes every other peptide currently in the DB
 *
 * Run from drsalesdirect/:  node scripts/rebuild-peptides.mjs
 * (If you hit a TLS cert error from a future system clock, prefix with
 *  NODE_TLS_REJECT_UNAUTHORIZED=0)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const PURECHAIN_STORE =
  'https://purechainresearch.com/wp-json/wc/store/v1/products?category=63&per_page=100&orderby=title&order=asc'

// MedicaPlanet's real peptide catalog → matching purechainresearch.com product slug.
// purechain: null  → not carried by purechain; falls back to mpPrice (MedicaPlanet wholesale).
const PEPTIDES = [
  { slug: 'glow-bpc-157-10mg-ghk-cu-50mg-tb500-10mg',          title: 'GLOW BPC-157 10mg + GHK-Cu 50mg + TB500 10mg', purechain: 'glow-ghk-cu-50mg-bpc-157-10mg-tb500-10mg' },
  { slug: 'klow-bpc-157-10mg-ghk-cu-50mg-tb500-10mg-kpv-10mg', title: 'KLOW BPC-157 10mg + GHK-Cu 50mg + TB500 10mg + KPV 10mg', purechain: 'klow-bpc-157-10mgghk-cu-50mgtb500-10mg-kpv-10mg' },
  { slug: '2x-blend-tesamorelin-10mg-ipamorelin-2mg',          title: '2X Blend Tesamorelin 10mg + Ipamorelin 2mg', purechain: null, mpPrice: 85 },
  { slug: 'aod-9604-5mg',                title: 'AOD-9604 5mg',               purechain: 'aod-9604-5-mg' },
  { slug: 'ara-290-14mg',                title: 'ARA-290 14mg',               purechain: 'ara-290-10-mg' },
  { slug: 'bpc-5mg-tb-5mg',              title: 'BPC 5mg + TB 5mg',           purechain: 'bpc-5mg-tb-5mg' },
  { slug: 'bpc-157-10mg',                title: 'BPC-157 10mg',               purechain: 'bpc-157-10mg' },
  { slug: 'bpc-157-20mg',                title: 'BPC-157 20mg',               purechain: 'bpc-157-20mg' },
  { slug: 'cagrilintide-10mg',           title: 'Cagrilintide 10mg',          purechain: 'cagrilintide-10mg' },
  { slug: 'cagrilintide-5mg-semaglutide-5mg', title: 'Cagrilintide 5mg + Semaglutide 5mg', purechain: 'cagrilintide-5mgsemaglutide-5mg' },
  { slug: 'cjc-1295-with-dac-10mg',      title: 'CJC-1295 With DAC 10mg',     purechain: 'cjc-1295-with-dac-5-mg' },
  { slug: 'cjc-1295-without-dac-5mg-ipa-5mg', title: 'CJC-1295 Without DAC 5mg + IPA 5mg', purechain: 'cjc-1295-no-dac-ipamorelin-5-mg-5-mg' },
  { slug: 'dsip-5mg',                    title: 'DSIP 5mg',                   purechain: 'dsip-5-mg' },
  { slug: 'epithalon-10mg',              title: 'Epithalon 10mg',             purechain: 'epithalon-10mg' },
  { slug: 'ghk-cu-100mg',                title: 'GHK-Cu 100mg',               purechain: 'ghk-cu-100mg' },
  { slug: 'ghk-cu-50mg',                 title: 'GHK-Cu 50mg',                purechain: 'ghk-cu-50mg' },
  { slug: 'hexarelin-5mg',               title: 'Hexarelin 5mg',              purechain: 'hexarelin-5mg' },
  { slug: 'igf-1-lr3-1mg',               title: 'IGF-1 LR3 1mg',              purechain: 'igf-1-lr3-1mg' },
  { slug: 'ipamorelin-10mg',             title: 'Ipamorelin 10mg',            purechain: 'ipamorelin-10mg' },
  { slug: 'kisspeptin-10',               title: 'Kisspeptin-10',              purechain: null, mpPrice: 59 },
  { slug: 'kpv-10mg',                    title: 'KPV 10mg',                   purechain: null, mpPrice: 45 },
  { slug: 'melanotan-ii-10mg',           title: 'Melanotan II 10mg',          purechain: 'mt-ii-melanotan-ii-10mg' },
  { slug: 'mots-c-10mg',                 title: 'MOTS-c 10mg',                purechain: 'mots-c-10mg' },
  { slug: 'nad-1000mg',                  title: 'NAD+ 1000mg',                purechain: 'nad-1000mg' },
  { slug: 'oxytocin-10mg',               title: 'Oxytocin 10mg',              purechain: 'oxytocin-10mg' },
  { slug: 'pe-22-28-10mg',               title: 'PE-22-28 10mg',              purechain: null, mpPrice: 59 },
  { slug: 'pt-141-10mg',                 title: 'PT-141 10mg',                purechain: 'pt-141-10mg' },
  { slug: 'retatrutide-5mg',             title: 'Retatrutide 5mg',            purechain: 'retatrutide' },
  { slug: 'retatrutide-10mg',            title: 'Retatrutide 10mg',           purechain: 'glp-1-r' },
  { slug: 'retatrutide-20mg',            title: 'Retatrutide 20mg',           purechain: 'glp-1-r-3' },
  { slug: 'selank-10mg',                 title: 'Selank 10mg',                purechain: 'selank-10mg' },
  { slug: 'semaglutide-5mg',             title: 'Semaglutide 5mg',            purechain: 'glp-1-s-2' },
  { slug: 'semaglutide-10mg',            title: 'Semaglutide 10mg',           purechain: 'glp-1-s-3' },
  { slug: 'semaglutide-20mg',            title: 'Semaglutide 20mg',           purechain: 'glp-1-s-4' },
  { slug: 'semax-30mg',                  title: 'Semax 30mg',                 purechain: 'semax-30mg' },
  { slug: 'sermorelin-10mg',             title: 'Sermorelin 10mg',            purechain: 'sermorelin-10mg' },
  { slug: 'ss-31-10mg',                  title: 'SS-31 10mg',                 purechain: 'ss-31-10mg' },
  { slug: 'tb-500-10mg',                 title: 'TB-500 10mg',                purechain: 'thymosin-beta-4-tb500-10mg' },
  { slug: 'tesamorelin-10mg',            title: 'Tesamorelin 10mg',           purechain: 'tesamorelin-10mg' },
  { slug: 'thymosin-alpha-1-10mg',       title: 'Thymosin Alpha-1 10mg',      purechain: 'thymosin-alpha-1-ta1-10mg' },
  { slug: 'tirzepatide-5mg',             title: 'Tirzepatide 5mg',            purechain: 'glp-1-t' },
  { slug: 'tirzepatide-10mg',            title: 'Tirzepatide 10mg',           purechain: 'glp-1-t-2' },
  { slug: 'tirzepatide-30mg',            title: 'Tirzepatide 30mg',           purechain: 'glp-1-t-4' },
  { slug: 'wolverine-blend-bpc-157-10mg-tb500-10mg', title: 'Wolverine Blend BPC-157 10mg + TB500 10mg', purechain: null, mpPrice: 89 },
]

function stripHtml(h) {
  return String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z0-9#]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}
function priceDollars(p) {
  const u = p.prices?.currency_minor_unit ?? 2
  return Number(p.prices?.price ?? 0) / 10 ** Number(u)
}
function imageUrl(p) {
  const img = Array.isArray(p.images) && p.images[0] ? p.images[0] : null
  return img ? (img.thumbnail || img.src || null) : null
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('Missing env vars'); process.exit(1) }

  console.log('Fetching purechainresearch.com store…')
  const res = await fetch(PURECHAIN_STORE, { headers: { Accept: 'application/json' } })
  if (!res.ok) { console.error('purechain fetch failed', res.status); process.exit(1) }
  const store = await res.json()
  const bySlug = new Map(store.map(p => [p.slug, p]))
  console.log('purechain products:', store.length)

  const sb = createClient(url, key, { auth: { persistSession: false } })
  const { data: cat } = await sb.from('categories').select('id').eq('slug', 'peptides').single()
  if (!cat) { console.error('peptides category missing'); process.exit(1) }
  const catId = cat.id

  const canonicalSlugs = new Set(PEPTIDES.map(p => p.slug))
  let priced = 0, noPrice = 0

  console.log('\n--- Upserting MedicaPlanet peptides (purechain pricing) ---')
  for (const pep of PEPTIDES) {
    const pc = pep.purechain ? bySlug.get(pep.purechain) : null
    // Price: purechain (authoritative) → MedicaPlanet wholesale fallback when not on purechain
    const price = pc ? priceDollars(pc) : (pep.mpPrice ?? 0)
    const img = pc ? imageUrl(pc) : null
    const desc = pc ? stripHtml(pc.description || pc.short_description).slice(0, 4000) : ''

    const { data: prod, error } = await sb.from('products').upsert({
      slug: pep.slug,
      title: pep.title,
      description: desc || 'Research-use peptide. Contact us for current availability.',
      category_id: catId,
      sku: `PEP-${pep.slug}`.slice(0, 64),
      base_price: price,
      price_tiers: [],
      currency: 'USD',
      is_active: true,
      is_featured: false,
      rating: 4.5,
      review_count: 0,
    }, { onConflict: 'slug' }).select('id').single()

    if (error) { console.error('  upsert fail', pep.slug, error.message); continue }

    // refresh image
    await sb.from('product_images').delete().eq('product_id', prod.id)
    if (img) await sb.from('product_images').insert({ product_id: prod.id, url: img, sort_order: 0 })

    if (price > 0) {
      priced++
      const src = pc ? 'purechain' : 'MedicaPlanet'
      console.log(`  ✓ ${pep.slug.padEnd(45)} $${price}  (${src})`)
    } else {
      noPrice++
      console.log(`  ? ${pep.slug.padEnd(45)} (no price — contact for pricing)`)
    }
  }

  // --- Delete every peptide NOT in the canonical set ---
  console.log('\n--- Removing non-MedicaPlanet peptides ---')
  const { data: existing } = await sb.from('products').select('id, slug').eq('category_id', catId)
  const toDelete = (existing ?? []).filter(p => !canonicalSlugs.has(p.slug))
  for (const p of toDelete) {
    await sb.from('product_images').delete().eq('product_id', p.id)
    const { error } = await sb.from('products').delete().eq('id', p.id)
    console.log(error ? `  ✗ ${p.slug}: ${error.message}` : `  🗑  deleted ${p.slug}`)
  }

  console.log(`\nDone. Peptides: ${PEPTIDES.length} (priced ${priced}, no purechain price ${noPrice}). Deleted ${toDelete.length} non-MedicaPlanet items.`)
}

main().catch(e => { console.error(e); process.exit(1) })
