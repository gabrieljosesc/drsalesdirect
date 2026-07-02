/**
 * Import the full live catalog from the old WordPress site (drsalesdirect.com)
 * into the new Supabase database, mapped onto our seeded categories.
 *
 * Source: public WooCommerce Store API
 *   https://drsalesdirect.com/wp-json/wc/store/v1/products?per_page=100&page=N
 *
 * - Maps WP categories -> our category slugs (most specific wins).
 * - "Best Sellers" / "Featured Products" -> is_featured = true.
 * - Downloads product images and uploads them to the Supabase Storage
 *   bucket `product-images` so the catalog survives the WordPress cutover.
 * - Idempotent: products upsert on slug; images are replaced per product.
 *
 * Run from drsalesdirect/:  node scripts/import-drsalesdirect.mjs
 * Options:
 *   --dry-run          fetch + map only, no DB writes
 *   --skip-images      import products but keep hotlinked WP image URLs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const WP_BASE = 'https://drsalesdirect.com/wp-json/wc/store/v1/products'
const BUCKET = 'product-images'
const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_IMAGES = process.argv.includes('--skip-images')

// ── WP category slug -> our category slug ─────────────────────────────
// Order matters: first match wins, so specific categories come before
// umbrella ones ("dermatology") and meta ones are excluded entirely.
const CATEGORY_MAP = [
  ['dermal-fillers-wholesale', 'dermal-fillers'],
  ['botulinum-toxins', 'botulinum-toxins'],
  ['thread-lifts', 'threads'],
  ['filler-removal', 'dermal-filler-removal'],
  ['needles-and-cannulas', 'cannulas-and-needles'],
  ['orthopaedic', 'orthopedic-injections'],
  ['peels-and-masks', 'peels-and-masks'],
  ['creams-and-serums', 'skincare'],
  ['skincare', 'skincare'],
  ['mesotherapy', 'mesotherapy'],
  ['body-sculpting', 'body-sculpting'],
  ['fat-removal', 'fat-removal'],
  ['weight-loss', 'weight-loss'],
  ['weight-management', 'weight-loss'],
  ['osteoporosis', 'osteoporosis'],
  ['prp-kits', 'prp-kits'],
  ['anaesthetics', 'anaesthetics'],
  ['gynecology', 'gynecology'],
  ['ophthalmology', 'ophthalmology'],
  ['rheumatoid-arthritis', 'rheumatology'],
  ['rheumatology', 'rheumatology'],
  ['arthritis', 'rheumatology'],
  ['psoriasis-and-psoriatic-arthritis', 'other'],
  ['inflammatory-bowel-disease', 'other'],
  ['crohns-disease-and-ulcerative-colitis-2', 'other'],
  ['multiple-sclerosis', 'other'],
  ['vaccines-and-immunology', 'other'],
  ['laser-accessories', 'other'],
]
const FEATURED_SLUGS = new Set(['best-sellers', 'featured-products'])
const META_SLUGS = new Set([...FEATURED_SLUGS, 'dermatology'])

// Last-resort keyword mapping for products only tagged with the
// "Dermatology" umbrella (or nothing recognizable).
function keywordCategory(title) {
  const t = title.toLowerCase()
  if (/(botox|dysport|xeomin|bocouture|azzalure|letybo|nabota|botulax|toxin)/.test(t)) return 'botulinum-toxins'
  if (/(juvederm|restylane|teosyal|stylage|belotero|revolax|saypha|aliaxin|profhilo|radiesse|sculptra|ellanse|neauvia|filler|hyaluronic)/.test(t)) return 'dermal-fillers'
  if (/(peel|mask)/.test(t)) return 'peels-and-masks'
  if (/(cream|serum|gel|lotion|cleanser|moistur)/.test(t)) return 'skincare'
  if (/(thread|pdo)/.test(t)) return 'threads'
  if (/(needle|cannula|syringe)/.test(t)) return 'cannulas-and-needles'
  return 'other'
}

function mapCategory(wpCategories, title) {
  const slugs = new Set((wpCategories ?? []).map(c => c.slug))
  for (const [wp, ours] of CATEGORY_MAP) if (slugs.has(wp)) return ours
  return keywordCategory(title)
}

// ── HTML -> plain text (our product page renders plain text) ──────────
function htmlToText(html) {
  if (!html) return ''
  return String(html)
    .replace(/<\s*(br|\/p|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8211;|&ndash;/gi, '–')
    .replace(/&#8217;|&rsquo;/gi, '’')
    .replace(/&#8216;|&lsquo;/gi, '‘')
    .replace(/&#8220;|&ldquo;/gi, '“')
    .replace(/&#8221;|&rdquo;/gi, '”')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function toPrice(prices) {
  const minor = Number(prices?.currency_minor_unit ?? 2)
  const raw = Number(prices?.price ?? 0)
  if (!Number.isFinite(raw)) return 0
  return raw / 10 ** minor
}

async function fetchAllProducts() {
  const all = []
  for (let page = 1; ; page++) {
    const res = await fetch(`${WP_BASE}?per_page=100&page=${page}`)
    if (!res.ok) throw new Error(`WP API page ${page}: HTTP ${res.status}`)
    const batch = await res.json()
    all.push(...batch)
    process.stdout.write(`  fetched page ${page} (${batch.length} products, total ${all.length})\n`)
    if (batch.length < 100) break
  }
  return all
}

async function uploadImage(supabase, url, storagePath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`image HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(error.message)
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const publicBase = `${url.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`

  console.log('Fetching catalog from drsalesdirect.com …')
  const products = await fetchAllProducts()
  console.log(`Total products on old site: ${products.length}\n`)

  // Our categories: slug -> id
  const { data: cats, error: catErr } = await supabase.from('categories').select('id, slug')
  if (catErr) { console.error('Cannot read categories:', catErr.message); process.exit(1) }
  const catId = Object.fromEntries((cats ?? []).map(c => [c.slug, c.id]))

  const counts = {}
  let imported = 0, imageCount = 0, failures = []

  for (const p of products) {
    const ourCat = mapCategory(p.categories, p.name)
    counts[ourCat] = (counts[ourCat] ?? 0) + 1
    const isFeatured = (p.categories ?? []).some(c => FEATURED_SLUGS.has(c.slug))

    if (!catId[ourCat]) {
      failures.push(`${p.slug}: no category id for "${ourCat}" — run supabase/setup.sql first`)
      continue
    }
    if (DRY_RUN) continue

    const shortText = htmlToText(p.short_description)
    const longText = htmlToText(p.description)
    const description = [shortText, longText].filter(Boolean).join('\n\n') || null
    const rating = Number(p.average_rating) || 0

    const record = {
      slug: p.slug,
      title: htmlToText(p.name) || p.name,
      description,
      category_id: catId[ourCat],
      sku: p.sku || null,
      base_price: toPrice(p.prices),
      price_tiers: [],
      currency: p.prices?.currency_code ?? 'USD',
      rating: rating > 0 ? rating : 4.5,
      review_count: Number(p.review_count) || 0,
      is_active: true,
      is_featured: isFeatured,
    }

    const { data: upserted, error: upErr } = await supabase
      .from('products')
      .upsert(record, { onConflict: 'slug' })
      .select('id')
      .single()
    if (upErr) { failures.push(`${p.slug}: ${upErr.message}`); continue }

    // Images: replace any existing rows for this product
    const images = (p.images ?? []).slice(0, 6)
    await supabase.from('product_images').delete().eq('product_id', upserted.id)

    const rows = []
    for (let i = 0; i < images.length; i++) {
      const src = images[i].src
      if (SKIP_IMAGES) { rows.push({ product_id: upserted.id, url: src, sort_order: i }); continue }
      const ext = (src.split('.').pop() || 'jpg').split('?')[0].toLowerCase().slice(0, 5)
      const storagePath = `catalog/${p.slug}-${i}.${ext}`
      try {
        await uploadImage(supabase, src, storagePath)
        rows.push({ product_id: upserted.id, url: `${publicBase}/${storagePath}`, sort_order: i })
        imageCount++
      } catch (e) {
        // fall back to hotlinking the WP URL rather than losing the image
        rows.push({ product_id: upserted.id, url: src, sort_order: i })
        failures.push(`${p.slug} image ${i}: ${e.message} (hotlinked instead)`)
      }
    }
    if (rows.length) {
      const { error: imgErr } = await supabase.from('product_images').insert(rows)
      if (imgErr) failures.push(`${p.slug} images: ${imgErr.message}`)
    }

    imported++
    if (imported % 25 === 0) console.log(`  imported ${imported}/${products.length} …`)
  }

  console.log('\n── Category breakdown (our categories) ──')
  for (const [slug, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug.padEnd(24)} ${n}`)
  }
  console.log(`\n${DRY_RUN ? '[dry-run] would import' : 'Imported'} ${DRY_RUN ? products.length : imported} products, ${imageCount} images uploaded.`)
  if (failures.length) {
    console.log(`\n⚠ ${failures.length} warnings:`)
    failures.slice(0, 20).forEach(f => console.log('  -', f))
    if (failures.length > 20) console.log(`  … and ${failures.length - 20} more`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
