/**
 * Comprehensive hand-map for client HD photos whose filenames could not be
 * auto-matched safely (concatenated names, brand abbreviations like PA=PhilArt,
 * SOFTFILL vs SOFTFIL spelling, mousse/MOUSE typos, etc.). Every pairing here
 * was verified by eye against the folder listing. Clean output — no watermark
 * (none of these are peptides).
 *
 * Products are resolved by exact-ish title pattern (ilike). A pattern that
 * resolves to 0 or 2+ products is reported and skipped, never guessed.
 *
 * Run:  node scripts/handmap-derm-batch.mjs
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })

const SRC = 'C:/Users/63950/Downloads/Product Photos Dermatology/Product Photos Dermatology'
const MP = 'C:/Users/63950/Desktop/gabby/medicaplanet/web/public/images'
const BUCKET = 'product-images'

// { q: title ilike pattern, files: [paths relative to SRC unless abs] }
const MAP = [
  { q: 'BCN ADIPO Box%', files: ['FAT REMOVAL/BCN/BCN ADIPO.jpg'] },
  { q: 'KYBELLA%', files: ['FAT REMOVAL/BELKYRA/kybella-belkyra-deoxycholic-acid-injection-10-mg-ml-471.png'] },
  { q: 'BOCOUTURE® 100 Units Dutch', files: ['BOTULINUM TOXINS/BOCOUTURE (XEOMIN)/BOCOUTURE® 100u (XEOMIN®).png'] },
  { q: 'BOCOUTURE® 100 Units Italian', files: ['BOTULINUM TOXINS/BOCOUTURE (XEOMIN)/BOCOUTURE® 100u (XEOMIN®).png'] },
  { q: 'BOCOUTURE® 50U Italian', files: ['BOTULINUM TOXINS/BOCOUTURE (XEOMIN)/BOCOUTURE® 50u (XEOMIN®) 1 vial.png'] },
  { q: 'SOFTFIL® PRECISION MICRO-CANNULA  25G/60mm%', files: ['CANNUALS AND NEEDLES/SOFTFILL/PRECISION Micro-Cannula 25G-60mm.png'] },
  { q: 'SOFTFIL® Precision Micro-Cannula 22G/40mm', files: ['CANNUALS AND NEEDLES/SOFTFILL/PRECISION Micro-Cannula 22G-40mm.png'] },
  { q: 'SOFTFIL® Precision Micro-Cannula 22G/50mm', files: ['CANNUALS AND NEEDLES/SOFTFILL/PRECISION Micro-Cannula 22G-50mm.png'] },
  { q: 'SOFTFIL® Precision Micro-Cannula 25G/40mm', files: ['CANNUALS AND NEEDLES/SOFTFILL/SOFTFILL-CANNULA-25G40MMXL-01.png'] },
  { q: 'SOFTFIL® Precision Micro-Cannula 30G/25mm', files: ['CANNUALS AND NEEDLES/SOFTFILL/PRECISION Micro-Cannula 30G-25mm.png'] },
  { q: 'CROMA™ PHILART EYE', files: ['DERMAL FILLERS/CROMA/PA-Eye.png'] },
  { q: 'CROMA™ PHILART HAIR', files: ['DERMAL FILLERS/CROMA/PA-Hair-300x300.png'] },
  { q: 'CROMA™ PHILART NEXT', files: ['DERMAL FILLERS/CROMA/PA-next.png'] },
  { q: 'FILORGA ART FILLER FINE LINES%', files: ['CANNUALS AND NEEDLES/FILLMED/FILLMED® ART FILLER FINE LINES with Lidocaine.png'] },
  { q: 'FILORGA ART FILLER LIPS with%', files: ['CANNUALS AND NEEDLES/FILLMED/FILLMED® ART FILLER LIPS with Lidocaine.png'] },
  { q: 'FILORGA ART FILLER VOLUME%', files: ['CANNUALS AND NEEDLES/FILLMED/FILLMED® ART FILLER VOLUME.png'] },
  { q: 'JUVÉDERM® ULTRA PLUS XC', files: ['DERMAL FILLERS/JUVEDERM/juvederm-ultra-plus-xc.png'] },
  { q: 'JUVEDERM® ULTRA XC', files: ['DERMAL FILLERS/JUVEDERM/juvedermultra-xc.png'] },
  { q: 'NEAUVIA™ Organic Intense', files: ['DERMAL FILLERS/NEAUVIA/Intense.png'] },
  { q: 'RADIESSE®1.5ml with Lidocaine', files: ['DERMAL FILLERS/RADIESSE/radiesse-15-lido-new-health-supplies-plus.png'] },
  { q: 'RESTYLANE® DEFYNE%', files: ['DERMAL FILLERS/RESTYLANE/Galderma_RestylaneDefyne_MorySkin-png.jpg'] },
  { q: 'Revanesse Shape+%', files: ['DERMAL FILLERS/RESTYLANE/Revanesse-shape-lipo.png'] },
  { q: 'SILHOUETTE SOFT® 12 CONES', files: ['THREADS/SILHOUETTE/SMS23-SILHOUETTE-SOFT-12CONES.png'] },
  { q: 'TEOSYAL® DEEP LINES', files: ['DERMAL FILLERS/TEOSYAL/PURESENSE DEEP LINES.png'] },
  { q: 'TEOSYAL® GLOBAL ACTION', files: ['DERMAL FILLERS/TEOSYAL/teosyal® puresense global action 1ml.png'] },
  { q: 'ULTRA V® ULTRACOL 200', files: ['DERMAL FILLERS/ULTRA V/UltraV_UltraCol200_MorySkin-png.png'] },
  { q: 'BELKYRA® (Bulgarian)', files: ['FAT REMOVAL/BELKYRA/belkyra-10mg-4x2ml-p-300x300.png'] },
  { q: 'AZELAC M CHEMICAL PEEL%', files: ['SKINCARE/MEDIDERMA/azelac-m-60-ml-ph-10.jpg'] },
  { q: 'AZELAC RU CHEMICAL PEEL%', files: ['SKINCARE/MEDIDERMA/azelac-ru-60-ml-ph-10.jpg'] },
  { q: 'BIOREPEELCL3® BODY', files: ['PEELS AND MASKS/BIOREPEELCL3/biorepeel-body.png'] },
  { q: 'FILORGA® POST PEEL', files: ['PEELS AND MASKS/FILORGA/FILORGA-POSTPEEL-Resize-600x600.png'] },
  { q: 'FILORGA® PRE PEEL', files: ['PEELS AND MASKS/FILORGA/i-filorga-pre-peel-resize.png'] },
  { q: 'MEDIDERMA C-DEFENCE MD C+SKIN Bright%', files: ['SKINCARE/MEDIDERMA/mediderma-c-defense-md-c-skin-bright-moisturizing-fluido-50ml.jpg'] },
  { q: 'PURIFYING CONTROL AS CLEANSER%', files: ['SKINCARE/MEDIDERMA/purifying-control-as-cleanser-mousse-daily-care.jpg'] },
  { q: 'SESDERMA C-VIT MIST%', files: ['SKINCARE/SESDERMA/40004036_CVIT_radiance_mist_1.png'] },
  { q: 'AZELAC RU LIPOSOMAL SERUM', files: ['SKINCARE/SESDERMA/sesderma-azelac-ru-liposomal-serum-depigmenting-booster-system-30ml.avif'] },
  { q: 'FACTOR G RENEW CREAM', files: ['SKINCARE/SESDERMA/sesderma_factor_g_renew_creme_regenerador_e_antienvelhecimento_50ml.jpeg'] },
  { q: 'MEDIDERMA® C-DEFENCE MD Flash&Go', files: ['SKINCARE/MEDIDERMA/c-defense-md-flash-go-glowing-active.jpg'] },
  { q: 'REPASKIN FLUID INVISIBLE%', files: ['SKINCARE/SESDERMA/40008197_REPASKIN_fluido_invisible_spf50_2.png'] },
  { q: 'CALECIM® Professional Multi-Action Cream 50g', files: [path.join(MP, 'CALECIM-MULTIACTIONCREAM-50G-01.jpg')] },
  { q: 'CALECIM® Professional Multi-Action Cream 20g', files: [path.join(MP, 'CALECIM-MULTIACTIONCREAM-50G-01.jpg')] },
  { q: 'CALECIM® Professional Restorative Hydration Cream 20g', files: [path.join(MP, 'CALECIM-RHYDRATIONCREAM-01.jpg')] },
  { q: 'CALECIM® Professional Restorative Hydration Cream 50g', files: [path.join(MP, 'CALECIM-RHYDRATIONCREAM-01.jpg')] },
  { q: 'CALECIM® Professional Serum%', files: [path.join(MP, 'CALECIM-PROFESSIONAL-SERUM-01.jpg'), path.join(MP, 'CALECIM-PROFESSIONAL-SERUM-02.jpg')] },
  { q: 'INTRALINE MONO M3038%', files: ['THREADS/INTRALINE/intraline-pdo-threads-mono-m3038-30g-38-50mm.png'] },
  { q: 'INTRALINE PDO THREADS Cog Dimension 360 B2190%', files: ['THREADS/INTRALINE/INTRALINE-PDODIMENSION360-B2190C-21G90MM150MM-01.png'] },
  { q: 'INTRALINE® PDO Threads TR2390%', files: ['THREADS/INTRALINE/Intraline-PDO-Thread-TR2390.png'] },
  { q: 'RAINBOW™ GOLD EMBOSSING MONO 29G 38mm%', files: ['THREADS/RAINBOW/GOLD EMBOSSING MONO 29G38X 20 pcs.png'] },
  { q: 'RAINBOW™ GOLD EMBOSSING MONO 29G 50mm%', files: ['THREADS/RAINBOW/RAINBOW® GOLD EMBOSSING MONO 29G50 X20pcs.png'] },
]

const clean = buf => sharp(buf).rotate().flatten({ background: '#ffffff' })
  .resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()

async function main() {
  const D = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`
  let ok = 0
  for (const e of MAP) {
    const { data: hits } = await D.from('products').select('id,slug,title').ilike('title', e.q)
    if (!hits || hits.length !== 1) { console.log(`✗ ${e.q}  -> ${hits?.length ?? 0} products, skipped`); continue }
    const p = hits[0]
    const rows = []
    for (let i = 0; i < e.files.length; i++) {
      const src = path.isAbsolute(e.files[i]) ? e.files[i] : path.join(SRC, e.files[i])
      if (!fs.existsSync(src)) { console.log(`✗ ${p.slug}: missing file ${e.files[i]}`); continue }
      try {
        const out = await clean(fs.readFileSync(src))
        const key = `hd/${p.slug}-${i}.jpg`
        const { error } = await D.storage.from(BUCKET).upload(key, out, { contentType: 'image/jpeg', upsert: true })
        if (error) throw new Error(error.message)
        rows.push({ product_id: p.id, url: `${publicBase}/${key}`, sort_order: i })
      } catch (err) { console.log(`✗ ${p.slug}[${i}]: ${err.message}`) }
    }
    if (rows.length) {
      await D.from('product_images').delete().eq('product_id', p.id)
      const { error } = await D.from('product_images').insert(rows)
      if (error) console.log(`✗ ${p.slug}: ${error.message}`)
      else { ok++; console.log(`✓ ${p.title.slice(0, 48)}`) }
    }
  }
  console.log(`\nHand-mapped ${ok}/${MAP.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
