/**
 * Adds the three peptide companion products (client items 100495–100497):
 *  - Hospira Sterile Water for Injection 50 mL — $25 flat (no volume pricing)
 *  - Covidien Webcol Large Alcohol Prep Pads (10/pk) — FREE with peptide orders
 *  - SureComfort U-100 Insulin Syringes 31G 1cc 5/16" (10/pk) — FREE with peptide orders
 *
 * Idempotent: upserts by slug, re-uploads the image into the product-images bucket.
 * Usage: node scripts/add-peptide-companions.mjs [--imgdir=<folder with water.jpg,pads.png,syringe.png>]
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true })
const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const IMGDIR = args.imgdir
const BUCKET = 'product-images'

const PRODUCTS = [
  {
    slug: 'hospira-sterile-water-for-injection-50ml',
    sku: '100495',
    title: 'Hospira Sterile Water for Injection, USP – 50 mL Vial',
    base_price: 25,
    is_free: false,
    image: { file: 'water.jpg', ext: 'jpg', type: 'image/jpeg' },
    description:
      'Hospira Sterile Water for Injection, USP, supplied in a 50 mL single-dose plastic fliptop vial (NDC 0409-4887-50). Sterile, nonpyrogenic, preservative-free water for use as a diluent when reconstituting lyophilized peptides.\n\n' +
      'Companion product: offered alongside our research peptide line and intended to accompany peptide orders.\n\n' +
      'Packaging: 50 mL per bottle.\nPricing: $25.00 per bottle, flat — the same price at any quantity (no volume-based price changes).\n\n' +
      'For drug diluent use only. Store at 20°C to 25°C (68°F to 77°F).',
  },
  {
    slug: 'covidien-webcol-large-alcohol-prep-pads',
    sku: '100496',
    title: 'Covidien Webcol Large Alcohol Prep Pads (10-Pack)',
    base_price: 0,
    is_free: true,
    image: { file: 'pads.png', ext: 'png', type: 'image/png' },
    description:
      'Covidien Webcol™ sterile alcohol prep pads, large, 2-ply, saturated with 70% isopropyl alcohol. Individually wrapped for single use.\n\n' +
      'Complimentary with peptide orders: this item is offered free of charge as a companion to your peptide purchase. Add it to your cart with your peptides and it ships at no cost.\n\n' +
      'Packaging: 10 pads per pack.\nFor external use only.',
  },
  {
    slug: 'surecomfort-u100-insulin-syringes-31g-1cc',
    sku: '100497',
    title: 'SureComfort U-100 Insulin Syringes, 31G × 5/16", 1cc (10-Pack)',
    base_price: 0,
    is_free: true,
    image: { file: 'syringe.png', ext: 'png', type: 'image/png' },
    description:
      'SureComfort® U-100 insulin syringes with a permanently attached 31-gauge, 5/16" (8 mm) short needle and 1cc (1 mL) barrel. Sterile, single use, with clear unit markings for accurate dosing.\n\n' +
      'Complimentary with peptide orders: this item is offered free of charge as a companion to your peptide purchase. Add it to your cart with your peptides and it ships at no cost.\n\n' +
      'Packaging: 10 syringes per pack.\nUse once and destroy.',
  },
]

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: cat, error: catErr } = await s.from('categories').select('id').eq('slug', 'peptides').single()
  if (catErr || !cat) throw new Error('Peptides category not found')

  for (const p of PRODUCTS) {
    const row = {
      slug: p.slug, sku: p.sku, title: p.title, description: p.description,
      category_id: cat.id, base_price: p.base_price, price_tiers: [], currency: 'USD',
      is_active: true, is_featured: false, is_free: p.is_free,
    }
    const { data: prod, error } = await s.from('products').upsert(row, { onConflict: 'slug' }).select('id').single()
    if (error) { console.error(`FAIL ${p.slug}: ${error.message}`); continue }
    console.log(`✓ ${p.title} → ${prod.id} (${p.is_free ? 'FREE' : '$' + p.base_price})`)

    if (!IMGDIR) continue
    const file = path.join(IMGDIR, p.image.file)
    if (!fs.existsSync(file)) { console.warn(`  (no image file ${file})`); continue }
    const objectPath = `${prod.id}/0.${p.image.ext}`
    const up = await s.storage.from(BUCKET).upload(objectPath, fs.readFileSync(file), { contentType: p.image.type, upsert: true })
    if (up.error) { console.error(`  image upload failed: ${up.error.message}`); continue }
    const url = s.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl
    await s.from('product_images').delete().eq('product_id', prod.id)
    await s.from('product_images').insert({ product_id: prod.id, url, sort_order: 0 })
    console.log(`  image → ${url}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
