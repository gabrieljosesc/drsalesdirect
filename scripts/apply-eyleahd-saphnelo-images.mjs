// Upload Eylea HD + Saphnelo product photos (clean, no watermark — not peptides)
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import sharp from 'sharp'
import fs from 'fs'

dotenv.config({ path: 'C:/Users/63950/Desktop/gabby/drsalesdirect/.env.local', override: true })
const D = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/product-images`

const JOBS = [
  { file: 'C:/Users/63950/Downloads/Eylea Hd.png', slug: 'eylea-hd' },
  { file: 'C:/Users/63950/Downloads/SAPHNELO.png', slug: 'saphnelo' },
]

for (const { file, slug } of JOBS) {
  const base = sharp(fs.readFileSync(file)).rotate().flatten({ background: '#ffffff' })
  const meta = await base.metadata()
  const out = await base.resize({ width: Math.min(meta.width || 1000, 1100), withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
  const keyPath = `hd/${slug}-0.jpg`
  const { error: upErr } = await D.storage.from('product-images').upload(keyPath, out, { contentType: 'image/jpeg', upsert: true })
  if (upErr) { console.log('✗', slug, upErr.message); continue }
  const { data: p } = await D.from('products').select('id, title').eq('slug', slug).single()
  await D.from('product_images').delete().eq('product_id', p.id)
  const { error: insErr } = await D.from('product_images').insert({ product_id: p.id, url: `${publicBase}/${keyPath}`, sort_order: 0 })
  console.log(insErr ? `✗ ${slug}: ${insErr.message}` : `✓ ${p.title}`)
}
