/**
 * One-off cleanup: strip the "Easy Table of Contents" (ez-toc) WordPress
 * widget from already-imported blog bodies. We render our own styled TOC
 * from the article headings instead, so the raw widget (a "Table of Contents"
 * heading, a "Toggle" link, and SVG icon glyphs) is removed.
 *
 * Run from drsalesdirect/:  node scripts/clean-blog-toc.mjs
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

export function stripToc(html) {
  return String(html || '')
    // the ez-toc list
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
    // the toggle control
    .replace(/<a[^>]*aria-label=["']Toggle Table of Content["'][^>]*>[\s\S]*?<\/a>/gi, '')
    // the "Table of Contents" title paragraph
    .replace(/<p>\s*Table of Contents\s*<\/p>/gi, '')
    // any now-empty wrappers left behind
    .replace(/<div>\s*<div>\s*<span>\s*<\/span>\s*<\/div>\s*<\/div>/gi, '')
    .replace(/<(div|span|p)>\s*<\/\1>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: posts, error } = await s.from('blog_posts').select('id, slug, body')
  if (error) { console.error(error.message); process.exit(1) }

  let changed = 0
  for (const p of posts) {
    const cleaned = stripToc(p.body)
    if (cleaned !== p.body) {
      const { error: uErr } = await s.from('blog_posts').update({ body: cleaned }).eq('id', p.id)
      if (uErr) { console.log('  ✗', p.slug, uErr.message); continue }
      changed++
    }
  }
  console.log(`Cleaned TOC from ${changed}/${posts.length} posts.`)
}

main().catch(e => { console.error(e); process.exit(1) })
