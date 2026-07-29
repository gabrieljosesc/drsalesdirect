/**
 * Hand-mapped HD images for products the auto-matcher skipped due to filename
 * typos or extra qualifiers (ORENICA->ORENCIA, Tesamoralin->Tesamorelin,
 * CJC-1295 DAC/No DAC, WEGOVY 0.25, PROLIA). Same subtle bottom-right logo
 * watermark as scripts/apply-hd-images.mjs.
 *
 * Run from drsalesdirect/:  node scripts/hand-map-images.mjs
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

const HD_ROOT = 'C:/Users/63950/hdimg'
const BUCKET = 'product-images'
const LOGO = path.join(ROOT, 'public', 'logo.png')
const WM_OPACITY = 0.55
const WM_WIDTH_PCT = 0.20

// slugs that share the given HD files (order = image order). Per the client,
// only peptides carry the watermark (wm: true); everything else stays clean.
const MAP = [
  { slugs: ['orencia', 'orencia-non-english'], files: ['rheumatology/ORENICA.png'], wm: false },
  { slugs: ['prolia', 'prolia-non-english'], files: ['rheumatology/PROLIA.png'], wm: false },
  { slugs: ['cjc-1295-no-dac-10mg'], files: ['peptides/14.CJC-1295 No DAC.jpg', 'peptides/13.CJC-1295 DAC.jpg'], wm: true },
  { slugs: ['tesamorelin-10mg'], files: ['peptides/3.Tesamoralin.jpg'], wm: true },
  { slugs: ['wegovy-flextouch-0-25mg'], files: ['weight-loss/WEGOVY 0.25 mg.png'], wm: false },
]

async function processImage(buf, watermark) {
  const base = sharp(buf).rotate().flatten({ background: '#ffffff' })
  const meta = await base.metadata()
  const W = Math.min(meta.width || 1000, 1100)
  const resized = await base.resize({ width: W, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
  if (!watermark) return resized
  const m2 = await sharp(resized).metadata()
  const iw = m2.width || W, ih = m2.height || W
  const logoW = Math.round(iw * WM_WIDTH_PCT)
  const logo = await sharp(LOGO).resize({ width: logoW }).ensureAlpha().toBuffer()
  const lm = await sharp(logo).metadata()
  const faded = await sharp(logo)
    .composite([{ input: Buffer.from([255, 255, 255, Math.round(255 * WM_OPACITY)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in' }])
    .png().toBuffer()
  const pad = Math.round(iw * 0.025)
  return sharp(resized)
    .composite([{ input: faded, left: Math.max(0, iw - logoW - pad), top: Math.max(0, ih - (lm.height || 0) - pad), blend: 'over' }])
    .jpeg({ quality: 88 }).toBuffer()
}

async function main() {
  const D = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`

  for (const entry of MAP) {
    // watermark each file once
    const outs = []
    for (const f of entry.files) {
      const p = path.join(HD_ROOT, f)
      if (!fs.existsSync(p)) { console.log('MISSING file:', f); continue }
      outs.push(await processImage(fs.readFileSync(p), entry.wm))
    }
    if (!outs.length) continue

    for (const slug of entry.slugs) {
      const { data: prod } = await D.from('products').select('id,title').eq('slug', slug).maybeSingle()
      if (!prod) { console.log('MISSING product:', slug); continue }
      const rows = []
      for (let i = 0; i < outs.length; i++) {
        const key = `hd/${slug}-${i}.jpg`
        const { error } = await D.storage.from(BUCKET).upload(key, outs[i], { contentType: 'image/jpeg', upsert: true })
        if (error) { console.log(`${slug}[${i}] upload:`, error.message); continue }
        rows.push({ product_id: prod.id, url: `${publicBase}/${key}`, sort_order: i })
      }
      if (rows.length) {
        await D.from('product_images').delete().eq('product_id', prod.id)
        const { error } = await D.from('product_images').insert(rows)
        console.log(error ? `${slug}: ${error.message}` : `✓ ${prod.title.slice(0, 36).padEnd(38)} (${rows.length} img)`)
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
