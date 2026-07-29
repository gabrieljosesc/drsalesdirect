/**
 * A few explicit hand-maps for products the auto-fill left behind due to
 * concatenated MedicaPlanet filenames / patch-vs-tube dose ties. All clean
 * (non-peptide). Sources are absolute paths.
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true })
const MP = 'C:/Users/63950/Desktop/gabby/medicaplanet/web/public/images'
const BUCKET = 'product-images'

const MAP = [
  { slug: 'emla', files: ['EMLA-30MG-01.jpg', 'EMLA-30MG-02.jpg', 'EMLA-30MG-03.jpg'] },
  { slug: 'emla-5x5g-60ml', files: ['EMLA-5X5-25MG-01.jpg', 'EMLA-5X5-25MG-02.jpg', 'EMLA-5X5-25MG-03.jpg'] },
  { slug: 'hyacorp-body-contouring-mlf1', files: ['HYACORP-BODYCONTOURING-MLF1-01.jpg'] },
  { slug: 'hyacorp-body-contouring-mlf2', files: ['HYACORP-BODYCONTOURING-MLF2.jpg'] },
]

const clean = buf => sharp(buf).rotate().flatten({ background: '#ffffff' })
  .resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()

async function main() {
  const D = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`
  for (const e of MAP) {
    const { data: p } = await D.from('products').select('id,title').eq('slug', e.slug).maybeSingle()
    if (!p) { console.log('MISSING product', e.slug); continue }
    const rows = []
    for (let i = 0; i < e.files.length; i++) {
      const src = path.join(MP, e.files[i])
      if (!fs.existsSync(src)) { console.log('MISSING file', e.files[i]); continue }
      const out = await clean(fs.readFileSync(src))
      const key = `fill/${e.slug}-${i}.jpg`
      const { error } = await D.storage.from(BUCKET).upload(key, out, { contentType: 'image/jpeg', upsert: true })
      if (error) { console.log(e.slug, error.message); continue }
      rows.push({ product_id: p.id, url: `${publicBase}/${key}`, sort_order: i })
    }
    if (rows.length) {
      await D.from('product_images').delete().eq('product_id', p.id)
      const { error } = await D.from('product_images').insert(rows)
      console.log(error ? `${e.slug}: ${error.message}` : `✓ ${p.title.slice(0, 34).padEnd(36)} (${rows.length} img)`)
    }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
