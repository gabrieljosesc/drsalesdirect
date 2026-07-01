/**
 * Dr Sales Direct — Product Seed Script
 * Mirrors the Medicaplanet product catalog (https://medicaplanet.com/shop/)
 *
 * Run with:  npx tsx scripts/seed-products.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iebpxtbrcsbgadwyrqqi.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllYnB4dGJyY3NiZ2Fkd3lycXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NjMxMiwiZXhwIjoyMDk0NDQyMzEyfQ.Il-MAFR5nAmkUppnVLeGEpZ6Bj1kzK486IKbAkgBjBk'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ─────────────────────────────────────────────
// IMAGE BASE URL
// ─────────────────────────────────────────────
const IMG = 'https://medicaplanet.com/images'

// ─────────────────────────────────────────────
// CATEGORIES  (slug must match schema.sql seed)
// ─────────────────────────────────────────────
const CATEGORY_SLUGS = [
  'botulinum-toxins',
  'cosmetic-fillers',
  'eyelash-enhancers',
  'orthopedic',
]

// ─────────────────────────────────────────────
// BRANDS
// ─────────────────────────────────────────────
const brandsToUpsert = [
  { name: 'Allergan',  slug: 'allergan'  },
  { name: 'AbbVie',   slug: 'abbvie'    },
  { name: 'Ipsen',    slug: 'ipsen'     },
  { name: 'Merz',     slug: 'merz'      },
  { name: 'Galderma', slug: 'galderma'  },
  { name: 'Radiesse', slug: 'radiesse'  },
  { name: 'Sanofi',   slug: 'sanofi'    },
  { name: 'Fidia',    slug: 'fidia'     },
  { name: 'Anika',    slug: 'anika'     },
]

// ─────────────────────────────────────────────
// PRODUCTS (15 products from Medicaplanet)
// ─────────────────────────────────────────────
type ProductSeed = {
  name: string
  slug: string
  short_description: string
  description: string
  price: number
  category_slug: string
  brand_slug: string
  images: string[]
  featured: boolean
}

const products: ProductSeed[] = [
  // ── BOTULINUM TOXINS ────────────────────────
  {
    name: 'BOTOX® 100u',
    slug: 'botox-100u',
    short_description: 'Botulinum type A for temporary reduction of glabellar lines and facial wrinkles.',
    description: `<p>BOTOX® 100u is a botulinum type A product manufactured by AbbVie. It is a wrinkle injection that treats glabellar lines and other facial wrinkles by temporarily blocking the release of acetylcholine from nerve endings, causing local muscle relaxation.</p>
<p>BOTOX® is the most widely recognized and clinically studied neuromodulator in aesthetic medicine, with decades of safety data. It is indicated for temporary improvement of moderate-to-severe glabellar lines, forehead lines, and crow's feet in adults.</p>
<ul>
  <li>Units: 100 units per vial</li>
  <li>Manufacturer: AbbVie</li>
  <li>Storage: Refrigerate at 2–8°C</li>
  <li>For use by licensed medical professionals only</li>
</ul>`,
    price: 399,
    category_slug: 'botulinum-toxins',
    brand_slug: 'abbvie',
    images: [`${IMG}/ABBVIE-BOTOX-100U-CZ-01.jpg`],
    featured: true,
  },
  {
    name: 'DYSPORT® 500u',
    slug: 'dysport-500u',
    short_description: 'Local muscle relaxant adapted from botulinum neuromodulator type-A for glabellar lines.',
    description: `<p>DYSPORT® 500u is a botulinum toxin type A product by Ipsen. It is a local muscle relaxant for temporary improvement in the appearance of moderate to severe glabellar lines in adults.</p>
<p>DYSPORT® has a well-established track record in both aesthetic and therapeutic applications. Its unique formulation allows for broader diffusion, making it particularly effective for treating larger muscle groups.</p>
<ul>
  <li>Units: 500 units per vial</li>
  <li>Manufacturer: Ipsen</li>
  <li>Storage: Refrigerate at 2–8°C</li>
  <li>For use by licensed medical professionals only</li>
</ul>`,
    price: 419,
    category_slug: 'botulinum-toxins',
    brand_slug: 'ipsen',
    images: [`${IMG}/DYSPORT-500U-1VIAL-ENGLISH_KOREAN-01.jpg`],
    featured: true,
  },
  {
    name: 'XEOMIN® 100u',
    slug: 'xeomin-100u',
    short_description: 'Pure botulinum toxin A, free from complexing proteins, for frown lines and cervical dystonia.',
    description: `<p>XEOMIN® 100u by Merz is a highly purified botulinum neurotoxin type A free from complexing proteins. This "naked" formulation reduces the risk of antibody formation, making XEOMIN® an excellent choice for patients who have developed resistance to other toxins.</p>
<p>XEOMIN® is indicated for the temporary improvement of moderate to severe glabellar lines and for therapeutic treatment of cervical dystonia and blepharospasm.</p>
<ul>
  <li>Units: 100 units per vial</li>
  <li>Manufacturer: Merz</li>
  <li>Storage: Room temperature (up to 25°C) before reconstitution</li>
  <li>For use by licensed medical professionals only</li>
</ul>`,
    price: 409,
    category_slug: 'botulinum-toxins',
    brand_slug: 'merz',
    images: [`${IMG}/MERZ-XEOMIN-100U-ENGLISH_KOREAN-01.jpg`],
    featured: false,
  },

  // ── DERMAL FILLERS ───────────────────────────
  {
    name: 'RADIESSE® 1.5ml',
    slug: 'radiesse-1-5ml',
    short_description: 'Injectable calcium hydroxylapatite filler for volume restoration and facial lifting.',
    description: `<p>RADIESSE® 1.5ml by Radiesse is an injectable dermal filler made of calcium hydroxylapatite (CaHA) microspheres suspended in a gel carrier. It provides immediate volume correction and stimulates the body's own natural collagen production for long-lasting results.</p>
<p>RADIESSE® is ideal for treating moderate-to-severe facial wrinkles, nasolabial folds, marionette lines, and for hand rejuvenation. It also provides a biostimulatory effect, improving skin quality over time.</p>
<ul>
  <li>Volume: 1.5ml per syringe</li>
  <li>Manufacturer: Radiesse</li>
  <li>Duration: 12–18 months</li>
  <li>For use by licensed medical professionals only</li>
</ul>`,
    price: 245,
    category_slug: 'cosmetic-fillers',
    brand_slug: 'radiesse',
    images: [`${IMG}/RADIESSE-1-5ML-01.png`],
    featured: true,
  },
  {
    name: 'RESTYLANE® 1ml',
    slug: 'restylane-1ml',
    short_description: 'Classic hyaluronic acid filler for fine lines, nasolabial folds, and lip enhancement.',
    description: `<p>RESTYLANE® 1ml by Galderma is a clear hyaluronic acid gel that adds volume to smooth away wrinkles and restore youthful facial contours. It is one of the most trusted and widely used dermal fillers in the world.</p>
<p>RESTYLANE® is effective for treating fine lines between the eyebrows, forehead lines, nasolabial folds, and for subtle lip enhancement. Its NASHA™ (Non-Animal Stabilized Hyaluronic Acid) technology ensures a safe, biocompatible, and long-lasting result.</p>
<ul>
  <li>Volume: 1ml per syringe</li>
  <li>HA Concentration: 20 mg/ml</li>
  <li>Manufacturer: Galderma</li>
  <li>Duration: 6–12 months</li>
</ul>`,
    price: 159,
    category_slug: 'cosmetic-fillers',
    brand_slug: 'galderma',
    images: [`${IMG}/RESTYLANE-1ML-01.png`],
    featured: true,
  },
  {
    name: 'RESTYLANE® 1ml with Lidocaine',
    slug: 'restylane-1ml-lidocaine',
    short_description: 'Hyaluronic acid filler with lidocaine for a more comfortable injection experience.',
    description: `<p>RESTYLANE® 1ml with Lidocaine combines Galderma's trusted hyaluronic acid filler with 0.3% lidocaine hydrochloride for enhanced patient comfort during treatment. It offers the same proven efficacy as classic RESTYLANE® with the added benefit of integrated anesthesia.</p>
<ul>
  <li>Volume: 1ml per syringe</li>
  <li>HA Concentration: 20 mg/ml</li>
  <li>Lidocaine: 0.3%</li>
  <li>Manufacturer: Galderma</li>
  <li>Duration: 6–12 months</li>
</ul>`,
    price: 179,
    category_slug: 'cosmetic-fillers',
    brand_slug: 'galderma',
    images: [`${IMG}/RESTYLANE-1ML-WITH-LIDOCAINE-NEW-BOX-01.png`],
    featured: false,
  },
  {
    name: 'RESTYLANE® LYFT',
    slug: 'restylane-lyft',
    short_description: 'Deep tissue hyaluronic acid filler for severe facial wrinkles and volume contouring.',
    description: `<p>RESTYLANE® LYFT (formerly Perlane) is a robust hyaluronic acid filler by Galderma designed for deep tissue injection. Its larger particle size makes it ideal for restoring lost facial volume, contouring cheeks, and treating deep nasolabial folds and facial hollows.</p>
<ul>
  <li>Volume: 1ml per syringe</li>
  <li>HA Concentration: 20 mg/ml</li>
  <li>Manufacturer: Galderma</li>
  <li>Duration: 9–12 months</li>
  <li>Injection depth: Deep dermis/subcutaneous</li>
</ul>`,
    price: 199,
    category_slug: 'cosmetic-fillers',
    brand_slug: 'galderma',
    images: [`${IMG}/GALDERMA-RESTYLANE-LYFT-1X1ML-01.jpg`],
    featured: false,
  },
  {
    name: 'RESTYLANE® LYFT with Lidocaine',
    slug: 'restylane-lyft-lidocaine',
    short_description: 'Deep filler for severe folds and facial volume, with lidocaine for patient comfort.',
    description: `<p>RESTYLANE® LYFT with Lidocaine provides the volumizing and lifting power of RESTYLANE® LYFT combined with 0.3% lidocaine for significantly improved patient comfort. Ideal for treating moderate-to-severe facial folds and restoring mid-face volume.</p>
<ul>
  <li>Volume: 1ml per syringe</li>
  <li>Lidocaine: 0.3%</li>
  <li>Manufacturer: Galderma</li>
  <li>Duration: 9–12 months</li>
</ul>`,
    price: 189,
    category_slug: 'cosmetic-fillers',
    brand_slug: 'galderma',
    images: [`${IMG}/RESTYLANE-LYFT-WITH-LIDOCAINE-NEW-BOX-01.png`],
    featured: false,
  },
  {
    name: 'JUVÉDERM® ULTRA 2',
    slug: 'juvederm-ultra-2',
    short_description: 'Smooth hyaluronic acid filler for fine lines, crow\'s feet, and the eye area.',
    description: `<p>JUVÉDERM® ULTRA 2 by Allergan uses VYCROSS® technology to create a smooth, cohesive gel ideal for treating fine superficial lines, crow's feet, and delicate areas around the eye. The integrated lidocaine ensures a comfortable treatment experience.</p>
<ul>
  <li>Volume: 2 × 0.55ml syringes</li>
  <li>HA Concentration: 18 mg/g</li>
  <li>Contains lidocaine for comfort</li>
  <li>Manufacturer: Allergan (AbbVie)</li>
  <li>Duration: 9–12 months</li>
</ul>`,
    price: 229,
    category_slug: 'cosmetic-fillers',
    brand_slug: 'allergan',
    images: [`${IMG}/JUVEDERM-ULTRA2-04.png`],
    featured: true,
  },
  {
    name: 'JUVÉDERM® ULTRA SMILE',
    slug: 'juvederm-ultra-smile',
    short_description: 'Specialized lip filler for perioral lines, lip asymmetry correction, and lip volume.',
    description: `<p>JUVÉDERM® ULTRA SMILE by Allergan is specifically formulated for lip enhancement and perioral line treatment. Its smooth, adaptable consistency delivers natural-looking lip augmentation with precise volume control and lasting hydration.</p>
<ul>
  <li>Volume: 2 × 0.55ml syringes</li>
  <li>Indication: Lips and perioral area</li>
  <li>Contains lidocaine</li>
  <li>Manufacturer: Allergan (AbbVie)</li>
  <li>Duration: 9–12 months</li>
</ul>`,
    price: 255,
    category_slug: 'cosmetic-fillers',
    brand_slug: 'allergan',
    images: [`${IMG}/JUVEDERM-ULTRASMILE-01.jpg`],
    featured: false,
  },
  {
    name: 'SCULPTRA® (2 vials)',
    slug: 'sculptra-2-vials',
    short_description: 'Poly-L-lactic acid collagen stimulator for deep facial volume restoration.',
    description: `<p>SCULPTRA® by Galderma is a unique injectable biostimulator made of poly-L-lactic acid (PLLA) that works within the deep dermis to revitalize collagen production. Unlike traditional fillers, SCULPTRA® provides gradual, natural-looking volume restoration that develops over several weeks.</p>
<p>SCULPTRA® is ideal for treating deep facial wrinkles, hollow cheeks, and overall facial volume loss associated with aging. Results can last up to 2+ years with a typical treatment protocol of 2–3 sessions.</p>
<ul>
  <li>Contents: 2 vials per package</li>
  <li>Active ingredient: Poly-L-lactic acid (PLLA)</li>
  <li>Manufacturer: Galderma</li>
  <li>Duration: Up to 2 years</li>
</ul>`,
    price: 525,
    category_slug: 'cosmetic-fillers',
    brand_slug: 'galderma',
    images: [`${IMG}/SCULPTRA-POLY-L-LACTIC-ACID-01.png`],
    featured: true,
  },

  // ── EYELASH ENHANCERS ────────────────────────
  {
    name: 'LATISSE® 3ml',
    slug: 'latisse-3ml',
    short_description: 'Bimatoprost ophthalmic solution for eyelash growth — length, thickness, and darkness.',
    description: `<p>LATISSE® (bimatoprost ophthalmic solution 0.03%) by Allergan is the first and only FDA-approved prescription treatment for inadequate or not enough lashes (hypotrichosis). It increases eyelash growth by lengthening the growth phase of the eyelash hair cycle.</p>
<p>Clinical studies have shown LATISSE® increases eyelash length by 25%, thickness/fullness by 106%, and darkness by 18% after 16 weeks of use.</p>
<ul>
  <li>Volume: 3ml bottle</li>
  <li>Active ingredient: Bimatoprost 0.03%</li>
  <li>Manufacturer: Allergan (AbbVie)</li>
  <li>Application: Once nightly to upper eyelid margin</li>
  <li>Results visible: 8–16 weeks</li>
</ul>`,
    price: 99,
    category_slug: 'eyelash-enhancers',
    brand_slug: 'allergan',
    images: [`${IMG}/LATISSE-3ML-01.png`],
    featured: false,
  },

  // ── ORTHOPEDIC ──────────────────────────────
  {
    name: 'SYNVISC ONE®',
    slug: 'synvisc-one',
    short_description: 'Single-injection hylan G-F 20 for knee osteoarthritis pain relief.',
    description: `<p>SYNVISC-ONE® by Sanofi is a single-injection viscosupplementation treatment for knee osteoarthritis pain. It contains hylan G-F 20, a substance that closely resembles natural synovial fluid, helping to restore the natural cushioning and lubrication of the knee joint.</p>
<p>SYNVISC-ONE® provides up to 6 months of osteoarthritis knee pain relief in a single injection, making it a convenient alternative to repeated corticosteroid injections or chronic NSAID use.</p>
<ul>
  <li>Volume: 6ml (single prefilled syringe)</li>
  <li>Active ingredient: Hylan G-F 20</li>
  <li>Manufacturer: Sanofi Genzyme</li>
  <li>Duration: Up to 6 months</li>
  <li>Indication: Knee osteoarthritis</li>
</ul>`,
    price: 359,
    category_slug: 'orthopedic',
    brand_slug: 'sanofi',
    images: [`${IMG}/SANOFI-SYNVISC-ONE-6ML-01.jpg`],
    featured: false,
  },
  {
    name: 'HYALGAN®',
    slug: 'hyalgan',
    short_description: 'Sodium hyaluronate injection for knee osteoarthritis pain in patients unresponsive to analgesics.',
    description: `<p>HYALGAN® by Fidia is a sterile solution of hyaluronate (sodium hyaluronate) derived from rooster combs. It is indicated for the treatment of pain in osteoarthritis of the knee in patients who have failed to respond adequately to conservative non-pharmacological therapy and simple analgesics.</p>
<ul>
  <li>Volume: 2ml per syringe</li>
  <li>Active ingredient: Sodium hyaluronate 10mg/ml</li>
  <li>Manufacturer: Fidia Farmaceutici</li>
  <li>Injection course: 3–5 weekly injections</li>
  <li>Indication: Knee osteoarthritis</li>
</ul>`,
    price: 44,
    category_slug: 'orthopedic',
    brand_slug: 'fidia',
    images: [`${IMG}/HYALGAN-1SYRINGE-ITALIAN-01.jpg`],
    featured: false,
  },
  {
    name: 'ORTHOVISC®',
    slug: 'orthovisc',
    short_description: 'High-molecular-weight hyaluronan for joint lubrication and osteoarthritis pain relief.',
    description: `<p>ORTHOVISC® by Anika Therapeutics is a high-molecular-weight hyaluronic acid (HA) product for intra-articular injection to treat pain associated with osteoarthritis of the knee. Its ultra-pure hyaluronan provides superior viscoelastic properties to restore joint function.</p>
<ul>
  <li>Volume: 2ml per syringe</li>
  <li>HA Concentration: 30mg/2ml (15mg/ml)</li>
  <li>Manufacturer: Anika Therapeutics</li>
  <li>Injection course: 3–4 weekly injections</li>
  <li>Indication: Knee osteoarthritis</li>
</ul>`,
    price: 90,
    category_slug: 'orthopedic',
    brand_slug: 'anika',
    images: [`${IMG}/ORTHOVISC-2ML-ENGLISH-01.jpg`],
    featured: false,
  },
]

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function seed() {
  console.log('🌱 Starting seed...\n')

  // 1. Upsert brands
  console.log('📦 Upserting brands...')
  const { error: brandErr } = await supabase
    .from('brands')
    .upsert(brandsToUpsert, { onConflict: 'slug' })
  if (brandErr) { console.error('❌ Brands error:', brandErr.message); process.exit(1) }
  console.log(`  ✓ ${brandsToUpsert.length} brands upserted`)

  // 2. Ensure sub-categories exist (botulinum-toxins, cosmetic-fillers, eyelash-enhancers are sub-categories)
  // First fetch the cosmetic parent category
  const { data: cosmeticCat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'cosmetic')
    .single()

  const extraCategories = [
    { name: 'Botulinum Toxins', slug: 'botulinum-toxins', parent_id: cosmeticCat?.id ?? null, sort_order: 2 },
    { name: 'Cosmetic Fillers', slug: 'cosmetic-fillers', parent_id: cosmeticCat?.id ?? null, sort_order: 1 },
    { name: 'Eyelash Enhancers', slug: 'eyelash-enhancers', parent_id: cosmeticCat?.id ?? null, sort_order: 4 },
  ]
  console.log('\n📂 Upserting sub-categories...')
  const { error: catErr } = await supabase
    .from('categories')
    .upsert(extraCategories, { onConflict: 'slug' })
  if (catErr) { console.error('❌ Categories error:', catErr.message); process.exit(1) }
  console.log(`  ✓ ${extraCategories.length} categories upserted`)

  // 3. Fetch all category + brand mappings
  const { data: allCats } = await supabase.from('categories').select('id, slug')
  const { data: allBrands } = await supabase.from('brands').select('id, slug')

  const catMap = Object.fromEntries((allCats ?? []).map(c => [c.slug, c.id]))
  const brandMap = Object.fromEntries((allBrands ?? []).map(b => [b.slug, b.id]))

  // 4. Upsert products
  console.log('\n🛍  Upserting products...')
  let ok = 0, fail = 0

  for (const p of products) {
    const catId = catMap[p.category_slug]
    const brandId = brandMap[p.brand_slug]

    if (!catId) { console.warn(`  ⚠ Category not found: ${p.category_slug} (${p.name})`); fail++; continue }
    if (!brandId) { console.warn(`  ⚠ Brand not found: ${p.brand_slug} (${p.name})`); fail++; continue }

    const { error } = await supabase
      .from('products')
      .upsert({
        name: p.name,
        slug: p.slug,
        short_description: p.short_description,
        description: p.description,
        price: p.price,
        sale_price: null,
        is_in_stock: true,
        category_id: catId,
        brand_id: brandId,
        images: p.images,
        featured: p.featured,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'slug' })

    if (error) {
      console.error(`  ❌ ${p.name}: ${error.message}`)
      fail++
    } else {
      console.log(`  ✓ ${p.name} — $${p.price}`)
      ok++
    }
  }

  console.log(`\n✅ Done! ${ok} products inserted/updated, ${fail} failed.`)

  // 5. Summary
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  console.log(`\n📊 Total products in database: ${count}`)
}

seed().catch(err => { console.error(err); process.exit(1) })
