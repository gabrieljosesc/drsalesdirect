/**
 * Scrape quantity-discount price tiers from the old WordPress site and
 * populate products.price_tiers in Supabase.
 *
 * The old site uses the "Tiered Pricing Table for WooCommerce" plugin, which
 * embeds the rules on each product page:
 *
 *   <table class="tiered-pricing-table"
 *          data-price-rules="{&quot;6&quot;:239,&quot;11&quot;:234,&quot;21&quot;:229}"
 *          data-minimum="1"
 *          data-price="249" ...>
 *
 * Keys of data-price-rules are the quantity where a new unit price starts.
 * We convert to our format: [{ minQ, maxQ, price }], where the last tier
 * gets maxQ = 100000 (rendered as "Buy N+").
 *
 * Run from drsalesdirect/:  node scripts/import-price-tiers.mjs
 * Options:  --dry-run   scrape + report only, no DB writes
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')
const CONCURRENCY = 6
const MAX_Q = 100000

function decodeEntities(s) {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'")
}

/** Parse the tier table attributes out of a product page's HTML. */
function parseTiers(html) {
  const table = html.match(/<table[^>]*tiered-pricing-table[^>]*>/)
  if (!table) return null
  const attrs = table[0]
  const rulesRaw = attrs.match(/data-price-rules="([^"]*)"/)?.[1]
  if (!rulesRaw) return null

  let rules
  try {
    rules = JSON.parse(decodeEntities(rulesRaw))
  } catch {
    return null
  }
  const entries = Object.entries(rules)
    .map(([q, p]) => [Number(q), Number(p)])
    .filter(([q, p]) => Number.isFinite(q) && Number.isFinite(p) && q > 0)
    .sort((a, b) => a[0] - b[0])
  if (entries.length === 0) return null

  const minimum = Number(attrs.match(/data-minimum="([^"]*)"/)?.[1]) || 1
  const basePrice = Number(attrs.match(/data-price="([^"]*)"/)?.[1])

  const tiers = []
  // First bracket: base price from the minimum quantity up to the first rule
  if (Number.isFinite(basePrice) && entries[0][0] > minimum) {
    tiers.push({ minQ: minimum, maxQ: entries[0][0] - 1, price: basePrice })
  }
  for (let i = 0; i < entries.length; i++) {
    const [q, p] = entries[i]
    const next = entries[i + 1]
    tiers.push({ minQ: q, maxQ: next ? next[0] - 1 : MAX_Q, price: p })
  }
  return tiers
}

async function fetchTiers(slug) {
  const res = await fetch(`https://drsalesdirect.com/product/${slug}/`, {
    headers: { 'user-agent': 'Mozilla/5.0 (catalog migration)' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return parseTiers(await res.text())
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing Supabase env in .env.local')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug')
    .order('slug')
  if (error) { console.error(error.message); process.exit(1) }

  console.log(`Scraping tier tables for ${products.length} products …`)

  let withTiers = 0, withoutTiers = 0, done = 0
  const failures = []
  const queue = [...products]

  async function worker() {
    for (;;) {
      const p = queue.shift()
      if (!p) return
      try {
        const tiers = await fetchTiers(p.slug)
        if (tiers && tiers.length) {
          withTiers++
          if (!DRY_RUN) {
            const { error: upErr } = await supabase
              .from('products')
              .update({ price_tiers: tiers })
              .eq('id', p.id)
            if (upErr) failures.push(`${p.slug}: ${upErr.message}`)
          }
        } else {
          withoutTiers++
        }
      } catch (e) {
        failures.push(`${p.slug}: ${e.message}`)
      }
      done++
      if (done % 50 === 0) console.log(`  ${done}/${products.length} …`)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}Done.`)
  console.log(`  products with tier pricing:    ${withTiers}`)
  console.log(`  products without tier pricing: ${withoutTiers}`)
  if (failures.length) {
    console.log(`\n⚠ ${failures.length} failures:`)
    failures.slice(0, 15).forEach(f => console.log('  -', f))
    if (failures.length > 15) console.log(`  … and ${failures.length - 15} more`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
