/**
 * Apply Michael's official peptide product photos (2026-09-10 set, 61 files
 * covering the full 62-product list — Epithalon 50mg shares the Epitalon shot).
 *
 * The client's set REPLACES every peptide image (he flagged that some current
 * photos show other brands). Filenames are mapped to slugs EXPLICITLY — file
 * names carry typos/shorthand ("Tesamoralin" = the 2X blend by list order,
 * "BPC 157 5mg" = the 500mcg) that defeat fuzzy matching.
 *
 * NO watermark is added: Michael's renders are already fully branded — the
 * Dr Sales Direct logo is on the vial label AND his own watermark is baked
 * into the bottom-right corner. Compositing ours doubled it up.
 *
 * Run:  node scripts/apply-peptide-images.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local'), override: true })

const DRY = process.argv.includes('--dry-run')
const SRC = 'C:/Users/63950/Downloads'
const BUCKET = 'product-images'
const LOGO = path.join(ROOT, 'public', 'logo.png')
const WM_OPACITY = 0.55
const WM_WIDTH_PCT = 0.20

/** file in Downloads -> product slug(s) */
const MAP = {
  '1.GLOW.png': ['glow-bpc-157-10mg-ghk-cu-50mg-tb500-10mg'],
  '2.KLOW.png': ['klow-bpc-157-10mg-ghk-cu-50mg-tb500-10mg-kpv-10mg'],
  '3.Tesamoralin.png': ['2x-blend-tesamorelin-10mg-ipamorelin-2mg'], // list position 3 = the 2X blend
  '4.AOD 9604.png': ['aod-9604-5-mg'],
  '5.ARA 290.png': ['ara-290-14mg'],
  '6.BDNF.png': ['bdnf-10mg'],
  '7.BPC TB 500.png': ['bpc-5mg-tb-5mg'],
  '8.BPC 157.png': ['bpc-157-10mg'],
  '9.BPC 157 20mg.png': ['bpc-157-20mg'],
  '10.BPC 157 5mg.png': ['bpc-157-500mcg'], // 0.5mg = 500mcg
  '11.Cagrilintide 10mg.png': ['cagrilintide-10mg-pm'],
  '12.Cagrilintide 5mg Semaglutide 5mg.png': ['cagrilintide-10mg'], // legacy slug of the blend
  '13.CJC-1295 DAC.png': ['cjc-1295-with-dac-10mg'],
  '14.CJC-1295 No DAC.png': ['cjc-1295-without-dac-5mg-ipa-5mg'],
  '15.Dihexa 8mg.png': ['dihexa-8mg'],
  '16.DSIP.png': ['dsip-10mg'],
  '17.Epitalon.png': ['epithalon-10mg', 'epithalon-50mg'], // one shot for both strengths
  '18.Follistatin 344 (95) 1mg.png': ['follistatin-344-95-1mg'],
  '19.FOXO4-DRI 10mg.png': ['foxo4-dri'],
  '20. GHK-Cu 100mg.png': ['ghk-cu-100mg'],
  '21. GHK-Cu 50mg.png': ['ghk-cu-50mg'],
  '22. GHRP-2 10mg.png': ['ghrp-2-10mg'],
  '23. GHRP-6 5mg.png': ['ghrp-6-5mg'],
  '24. Gonadorelin 10mg.png': ['gonadorelin-10mg'],
  '25. Hexarelin 5mg.png': ['hexarelin-5mg'],
  '26. IGF-1 LR3 1mg.png': ['igf-1-lr3-1mg'],
  '27. Ipamorelin 10mg.png': ['ipamorelin-10mg'],
  '28. Kisspeptin-10.png': ['kisspeptin-10'],
  '29. KPV 10mg.png': ['kpv-10mg'],
  '30. Melanotan I 10mg.png': ['mt-ii-melanotan-ii-10mg'],   // legacy slug, title Melanotan I
  '31. Melanotan II 10mg.png': ['mt-ii-melanotan-ii-10mg-1'],
  '32. MOTS-c 10mg.png': ['mots-c-10mg'],
  '33. NAD 1000mg.png': ['nad'],
  '34. Oxytocin 10mg.png': ['oxytocin-10mg'],
  '35. PE-22-28 10mg.png': ['pe-22-28-10mg'],
  '36. PNC-28.png': ['pnc-28'],
  '37. PT-141 10mg.png': ['pt-141-10mg'],
  '38. Retatrutide 10mg.png': ['retatrutide-10mg'],
  '39. Retatrutide 15mg.png': ['retatrutide-15mg'],
  '40. Retatrutide 20mg.png': ['retatrutide-20mg'],
  '41. Retatrutide 5mg.png': ['retatrutide'],
  '42. Retatrutide 60mg.png': ['retatrutide-60mg'],
  '43. Selank 10mg.png': ['selank-10mg-pm'],
  '44. Semaglutide 10mg.png': ['semaglutide-10mg'],
  '45. Semaglutide 20mg.png': ['semaglutide-20mg'],
  '46. Semaglutide 50mg.png': ['semaglutide-50mg'],
  '47. Semaglutide 5mg.png': ['semaglutide-5mg'],
  '48. Semax 30mg.png': ['semax-30mg'],
  '49. Sermorelin 10mg.png': ['sermorelin-10mg'],
  '50. SS-31 10mg.png': ['ss-31-10mg'],
  '51. TB-500 10mg.png': ['klow-bpc-157-10mgghk-cu-50mgtb500-10mg-kpv-10mg'], // TB-500's legacy slug
  '52. Tesamorelin 10mg.png': ['tesamorelin-10mg'],
  '53. Tesofensine 500mcg.png': ['tesofensine-500mcg'],
  '54. Thymosin Alpha-1 10mg.png': ['thymosin-alpha-1-ta1-10mg'],
  '55. Tirzepatide 10mg.png': ['tirzepatide-10mg'],
  '56. Tirzepatide 100mg.png': ['tirzepatide-100mg'],
  '57. Tirzepatide 15mg.png': ['tirzepatide-15mg'],
  '58. Tirzepatide 30mg.png': ['tirzepatide-30mg'],
  '59. Tirzepatide 5mg.png': ['tirzepatide-5mg'],
  '60. Tirzepatide 60mg.png': ['tirzepatide-60mg'],
  '61. Wolverine Blend.png': ['wolverine-blend-bpc-157-10mg-tb500-10mg'],
}

async function processImage(buf) {
  const base = sharp(buf).rotate().flatten({ background: '#ffffff' })
  const meta = await base.metadata()
  const W = Math.min(meta.width || 1000, 1100)
  return base.resize({ width: W, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const D = createClient(url, key, { auth: { persistSession: false } })
  const publicBase = `${url.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`

  const slugs = Object.values(MAP).flat()
  const { data: prods, error } = await D.from('products').select('id, slug, title').in('slug', slugs)
  if (error) throw new Error(error.message)
  const bySlug = new Map(prods.map(p => [p.slug, p]))

  const missingFiles = Object.keys(MAP).filter(f => !fs.existsSync(path.join(SRC, f)))
  const missingSlugs = slugs.filter(s => !bySlug.has(s))
  if (missingFiles.length) console.log('MISSING FILES:', missingFiles.join(', '))
  if (missingSlugs.length) console.log('MISSING SLUGS:', missingSlugs.join(', '))
  console.log(`files: ${Object.keys(MAP).length} -> products: ${slugs.length} (${prods.length} found)`)
  if (DRY || missingFiles.length || missingSlugs.length) {
    for (const [f, ss] of Object.entries(MAP)) ss.forEach(s => console.log(`  ${f.padEnd(42)} -> ${bySlug.get(s)?.title ?? '??'} (${s})`))
    if (DRY) console.log('\n(dry run — nothing written)')
    if (missingFiles.length || missingSlugs.length) process.exit(1)
    return
  }

  let done = 0
  const failures = []
  for (const [file, ss] of Object.entries(MAP)) {
    let out
    try { out = await processImage(fs.readFileSync(path.join(SRC, file))) }
    catch (e) { failures.push(`${file}: ${e.message}`); continue }
    for (const slug of ss) {
      const p = bySlug.get(slug)
      try {
        const keyPath = `hd/${slug}-0.jpg`
        const { error: upErr } = await D.storage.from(BUCKET).upload(keyPath, out, { contentType: 'image/jpeg', upsert: true })
        if (upErr) throw new Error(upErr.message)
        await D.from('product_images').delete().eq('product_id', p.id)
        const { error: insErr } = await D.from('product_images').insert({
          product_id: p.id, url: `${publicBase}/${keyPath}?v=3`, sort_order: 0,
        })
        if (insErr) throw new Error(insErr.message)
        done++
        console.log(`  ✓ ${p.title}`)
      } catch (e) { failures.push(`${slug}: ${e.message}`) }
    }
  }
  console.log(`\nApplied official images to ${done} peptide products.`)
  if (failures.length) { console.log(`⚠ ${failures.length} failures:`); failures.forEach(f => console.log('  -', f)) }
}

main().catch(e => { console.error(e); process.exit(1) })
