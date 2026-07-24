/**
 * Upgrade inline blog images to full resolution.
 *
 * The WordPress post bodies reference downscaled variants (e.g.
 * `...-508x339.webp`), so the imported articles look blurry. The full-size
 * original lives at the same path without the `-WIDTHxHEIGHT` suffix.
 *
 * This re-walks each post's ORIGINAL WordPress markup using the same image
 * ordering as scripts/import-blog.mjs, downloads the full-size version, and
 * overwrites the SAME storage object (blog/<slug>/img-<i>.<ext>). Because the
 * paths are unchanged, the stored post bodies keep working untouched.
 *
 * Run from drsalesdirect/:  node scripts/upgrade-blog-images.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const WP = 'https://drsalesdirect.com/wp-json/wp/v2/posts'
const BUCKET = 'product-images'
const DRY = process.argv.includes('--dry-run')

/** Strip a WordPress `-1024x768` size suffix to get the original upload. */
function fullSizeUrl(url) {
  return url.replace(/-\d{2,4}x\d{2,4}(\.[a-z0-9]+)$/i, '$1')
}

function extOf(u) {
  const e = (u.split('?')[0].split('.').pop() || 'jpg').toLowerCase()
  return /^(jpe?g|png|webp|gif|avif)$/.test(e) ? e : 'jpg'
}

async function head(url) {
  try {
    const r = await fetch(url, { method: 'GET', headers: { range: 'bytes=0-0' } })
    return r.ok
  } catch { return false }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('Missing Supabase env'); process.exit(1) }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  console.log('Fetching original posts from WordPress …')
  const res = await fetch(`${WP}?per_page=100&_embed=1&orderby=date&order=desc`, {
    headers: { 'user-agent': 'Mozilla/5.0 (blog image upgrade)' },
  })
  const posts = await res.json()
  console.log(`${posts.length} posts.\n`)

  let upgraded = 0, skipped = 0, failed = 0

  for (const p of posts) {
    const html = String(p.content?.rendered ?? '')
    // same ordering rule as the importer: unique srcs on the old domain
    const srcs = [...new Set([...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map(m => m[1]))]
      .filter(s => /drsalesdirect\.com/i.test(s))

    for (let i = 0; i < srcs.length; i++) {
      const original = srcs[i]
      const big = fullSizeUrl(original)
      if (big === original) { skipped++; continue }        // already full size
      if (!(await head(big))) { skipped++; continue }       // no larger version

      const storagePath = `blog/${p.slug}/img-${i}.${extOf(original)}`
      if (DRY) {
        console.log(`  would upgrade ${storagePath}  <- ${big.split('/').pop()}`)
        upgraded++
        continue
      }
      try {
        const r = await fetch(big, { headers: { 'user-agent': 'Mozilla/5.0' } })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const buf = Buffer.from(await r.arrayBuffer())
        const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
          contentType: r.headers.get('content-type') || 'image/webp',
          upsert: true,
        })
        if (error) throw new Error(error.message)
        upgraded++
      } catch (e) {
        failed++
        console.log(`  ✗ ${storagePath}: ${e.message}`)
      }
    }
  }

  console.log(`\n${DRY ? '[dry-run] ' : ''}Upgraded ${upgraded} images, skipped ${skipped}, failed ${failed}.`)
}

main().catch(e => { console.error(e); process.exit(1) })
