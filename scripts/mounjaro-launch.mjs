/**
 * Mounjaro go-live (client pricing + images, 2026-09-14) and Xolair re-category.
 *
 *  - Applies the 8 product photos, sets confirmed prices, clears Coming Soon.
 *  - Groups the listings like Ozempic: titles end with the dose so the
 *    product-page dose selector unites each family — one card for the
 *    English Alternative family (2.5-15mg) and one for the plain KwikPen
 *    family (2.5/7.5mg); lowest dose is the shop card.
 *  - Moves XOLAIR from the off-nav Asthma category to Rheumatology.
 *
 * Run:  node scripts/mounjaro-launch.mjs
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import sharp from 'sharp'
import fs from 'fs'

dotenv.config({ path: '.env.local', override: true })
const D = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/product-images`
const SRC = 'C:/Users/63950/Downloads'

const PRODUCTS = [
  { slug: 'mounjaro-2-5mg-kwikpen',          title: 'MOUNJARO® KwikPen 2.5mg',                        price: 469, primary: true,  file: 'Mounjaro® 2.5 mg KwikPen®.png' },
  { slug: 'mounjaro-7-5mg-kwikpen',          title: 'MOUNJARO® KwikPen 7.5mg',                        price: 510, primary: false, file: 'Mounjaro® 7.5 mg KwikPen®.png' },
  { slug: 'mounjaro-2-5mg-kwikpen-english',  title: 'MOUNJARO® KwikPen (English Alternative) 2.5mg',  price: 469, primary: true,  file: 'Mounjaro® 2.5 mg KwikPen® (English Alternative).png' },
  { slug: 'mounjaro-5mg-kwikpen-english',    title: 'MOUNJARO® KwikPen (English Alternative) 5mg',    price: 499, primary: false, file: 'Mounjaro® 5 mg KwikPen® (English Alternative).png' },
  { slug: 'mounjaro-7-5mg-kwikpen-english',  title: 'MOUNJARO® KwikPen (English Alternative) 7.5mg',  price: 519, primary: false, file: 'Mounjaro® 7.5 mg KwikPen® (English Alternative).png' },
  { slug: 'mounjaro-10mg-kwikpen-english',   title: 'MOUNJARO® KwikPen (English Alternative) 10mg',   price: 539, primary: false, file: 'Mounjaro® 10 mg KwikPen® (English Alternative).png' },
  { slug: 'mounjaro-12-5mg-kwikpen-english', title: 'MOUNJARO® KwikPen (English Alternative) 12.5mg', price: 579, primary: false, file: 'Mounjaro® 12.5 mg KwikPen® (English Alternative).png' },
  { slug: 'mounjaro-15mg-kwikpen-english',   title: 'MOUNJARO® KwikPen (English Alternative) 15mg',   price: 599, primary: false, file: 'Mounjaro® 15 mg KwikPen® (English Alternative).png' },
]

for (const p of PRODUCTS) {
  const src = `${SRC}/${p.file}`
  if (!fs.existsSync(src)) { console.log(`✗ missing file: ${p.file}`); continue }
  const base = sharp(fs.readFileSync(src)).rotate().flatten({ background: '#ffffff' })
  const meta = await base.metadata()
  const out = await base.resize({ width: Math.min(meta.width || 1000, 1100), withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
  const keyPath = `hd/${p.slug}-0.jpg`
  const { error: upErr } = await D.storage.from('product-images').upload(keyPath, out, { contentType: 'image/jpeg', upsert: true })
  if (upErr) { console.log(`✗ upload ${p.slug}: ${upErr.message}`); continue }

  const { data: row, error: qErr } = await D.from('products').select('id').eq('slug', p.slug).single()
  if (qErr) { console.log(`✗ find ${p.slug}: ${qErr.message}`); continue }
  await D.from('product_images').delete().eq('product_id', row.id)
  await D.from('product_images').insert({ product_id: row.id, url: `${publicBase}/${keyPath}`, sort_order: 0 })
  const { error: uErr } = await D.from('products').update({
    title: p.title,
    base_price: p.price,
    price_tiers: [],
    is_coming_soon: false,
    is_dose_primary: p.primary,
  }).eq('id', row.id)
  console.log(uErr ? `✗ ${p.slug}: ${uErr.message}` : `✓ ${p.title} — $${p.price}${p.primary ? ' (family card)' : ''}`)
}

// Xolair: Asthma is off-nav; the client wants it under Rheumatology
const { data: rheum } = await D.from('categories').select('id').eq('name', 'Rheumatology').single()
const { error: xErr } = await D.from('products').update({ category_id: rheum.id }).eq('slug', 'xolair-150mg-100017')
console.log(xErr ? `✗ xolair: ${xErr.message}` : '✓ XOLAIR® 150mg moved to Rheumatology')
