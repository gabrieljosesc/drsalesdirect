/**
 * Download every remaining external product image directly from its current
 * URL (medicaplanet.com is back up) into our product-images bucket and repoint
 * the row. Idempotent: rows already on *.supabase.co are skipped.
 *
 *   node scripts/localize-direct.mjs --dry
 *   node scripts/localize-direct.mjs
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true })
const DRY = process.argv.includes('--dry')
const BUCKET = 'product-images'
const CONCURRENCY = 5
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: imgs } = await s.from('product_images').select('id, product_id, url')
  const ext = (imgs ?? []).filter(r => { try { return !new URL(r.url).host.endsWith('.supabase.co') } catch { return false } })
  console.log(`external images: ${ext.length}${DRY ? ' (dry)' : ''}`)

  let ok = 0, fail = 0; const fails = []; let i = 0
  async function worker() {
    while (i < ext.length) {
      const r = ext[i++]
      try {
        const res = await fetch(r.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const buf = Buffer.from(await res.arrayBuffer()); if (buf.length < 100) throw new Error('too small')
        if (!DRY) {
          const ct = res.headers.get('content-type') || 'image/jpeg'
          const objectPath = `${r.product_id}/${r.id}.${EXT[ct.split(';')[0].trim()] || 'jpg'}`
          const up = await s.storage.from(BUCKET).upload(objectPath, buf, { contentType: ct, upsert: true })
          if (up.error) throw new Error(up.error.message)
          const pub = s.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl
          await s.from('product_images').update({ url: pub }).eq('id', r.id)
        }
        ok++; if (ok % 25 === 0) console.log(`  …${ok}`)
      } catch (e) { fail++; fails.push(`${r.url.split('/').pop()} — ${e.message}`) }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  console.log(`\nlocalized=${ok}, failed=${fail}`)
  fails.slice(0, 20).forEach(f => console.log('  - ' + f))
}
main().catch(e => { console.error(e); process.exit(1) })
