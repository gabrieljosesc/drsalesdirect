/**
 * Import all blog posts from the old WordPress site into Supabase.
 *
 * Source: WordPress REST API
 *   https://drsalesdirect.com/wp-json/wp/v2/posts?per_page=100&_embed=1
 *
 * For each post: title, slug, excerpt, HTML body, publish date, and the
 * featured image. Featured images AND inline <img> in the body are downloaded
 * and re-hosted in Supabase Storage (product-images/blog/...) so the blog
 * survives the WordPress cutover. Body HTML is lightly sanitized.
 *
 * Requires the blog_posts.image_url column (supabase/blog-image-url.sql).
 *
 * Run from drsalesdirect/:  node scripts/import-blog.mjs
 * Options:  --dry-run     fetch + parse only, no DB writes / uploads
 *           --skip-images keep original WP image URLs (will break at cutover)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const WP = 'https://drsalesdirect.com/wp-json/wp/v2/posts'
const BUCKET = 'product-images'
const DRY_RUN = process.argv.includes('--dry-run')
const SKIP_IMAGES = process.argv.includes('--skip-images')

const OLD_SEED_SLUGS = [
  'how-ordering-works', 'cold-chain-for-injectables',
  'manual-order-workflow',
]

function decodeEntities(s) {
  return String(s || '')
    .replace(/&#8217;|&#039;|&#39;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function stripTags(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

/** Light sanitize: drop scripts/styles/iframes, WP block comments, ez-toc, srcset. */
function cleanBody(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    // Easy Table of Contents widget (we render our own TOC)
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<a[^>]*aria-label=["']Toggle Table of Content["'][^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<p>\s*Table of Contents\s*<\/p>/gi, '')
    .replace(/\ssrcset="[^"]*"/gi, '')
    .replace(/\ssizes="[^"]*"/gi, '')
    .replace(/\sclass="[^"]*"/gi, '')
    .replace(/\sid="[^"]*"/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .trim()
}

async function fetchAllPosts() {
  const res = await fetch(`${WP}?per_page=100&_embed=1&orderby=date&order=desc`, {
    headers: { 'user-agent': 'Mozilla/5.0 (blog migration)' },
  })
  if (!res.ok) throw new Error(`WP posts API: HTTP ${res.status}`)
  return res.json()
}

function extFromUrl(u) {
  const clean = u.split('?')[0]
  const e = (clean.split('.').pop() || 'jpg').toLowerCase()
  return /^(jpe?g|png|webp|gif|avif)$/.test(e) ? e.replace('jpeg', 'jpg') : 'jpg'
}

async function uploadFromUrl(supabase, srcUrl, storagePath) {
  const res = await fetch(srcUrl, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`image HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, { contentType, upsert: true })
  if (error) throw new Error(error.message)
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('Missing Supabase env in .env.local'); process.exit(1) }
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const publicBase = `${url.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`

  // Guard: the image_url column must exist
  if (!DRY_RUN) {
    const { error: colErr } = await supabase.from('blog_posts').select('image_url').limit(1)
    if (colErr) {
      console.error('\n✗ blog_posts.image_url is missing. Run this first in the Supabase SQL editor:')
      console.error('    alter table public.blog_posts add column if not exists image_url text;\n')
      process.exit(1)
    }
  }

  console.log('Fetching posts from drsalesdirect.com …')
  const posts = await fetchAllPosts()
  console.log(`Found ${posts.length} posts.\n`)

  let imported = 0, images = 0
  const failures = []

  for (const p of posts) {
    const slug = p.slug
    const title = stripTags(p.title?.rendered) || slug
    const excerpt = stripTags(p.excerpt?.rendered).slice(0, 300) || null
    let body = cleanBody(p.content?.rendered)
    const publishedAt = p.date_gmt ? `${p.date_gmt}Z` : (p.date ?? null)

    let imageUrl = null
    const featured = p._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null

    if (!DRY_RUN && !SKIP_IMAGES) {
      // Featured image
      if (featured) {
        try {
          const sp = `blog/${slug}/cover.${extFromUrl(featured)}`
          await uploadFromUrl(supabase, featured, sp)
          imageUrl = `${publicBase}/${sp}`
          images++
        } catch (e) { failures.push(`${slug} cover: ${e.message}`); imageUrl = featured }
      }
      // Inline body images hosted on the old domain
      const srcs = [...body.matchAll(/<img[^>]+src="([^"]+)"/gi)].map(m => m[1])
      let i = 0
      for (const src of [...new Set(srcs)]) {
        if (!/drsalesdirect\.com/i.test(src)) continue
        try {
          const sp = `blog/${slug}/img-${i}.${extFromUrl(src)}`
          await uploadFromUrl(supabase, src, sp)
          body = body.split(src).join(`${publicBase}/${sp}`)
          images++; i++
        } catch (e) { failures.push(`${slug} inline ${i}: ${e.message}`) }
      }
    } else if (featured) {
      imageUrl = featured
    }

    if (DRY_RUN) {
      console.log(`  • ${title.slice(0, 60)}  [${slug}]  img:${featured ? 'y' : 'n'}`)
      imported++
      continue
    }

    const { error } = await supabase.from('blog_posts').upsert({
      slug, title, excerpt, body,
      image_url: imageUrl,
      published_at: publishedAt,
      is_published: true,
    }, { onConflict: 'slug' })
    if (error) { failures.push(`${slug}: ${error.message}`); continue }
    imported++
    if (imported % 10 === 0) console.log(`  imported ${imported}/${posts.length} …`)
  }

  // Remove the old placeholder seed posts
  if (!DRY_RUN) {
    await supabase.from('blog_posts').delete().in('slug', OLD_SEED_SLUGS)
  }

  console.log(`\n${DRY_RUN ? '[dry-run] parsed' : 'Imported'} ${imported} posts, ${images} images re-hosted.`)
  if (failures.length) {
    console.log(`\n⚠ ${failures.length} warnings:`)
    failures.slice(0, 15).forEach(f => console.log('  -', f))
    if (failures.length > 15) console.log(`  … and ${failures.length - 15} more`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
