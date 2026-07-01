/**
 * Replace placeholder blog posts with the real ones from the old WordPress
 * site (drsalesdirect.com/blog). Pulls title, excerpt, and body.
 *
 * Run:  NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/ingest-blog.mjs
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const POSTS = [
  { slug: 'eye-drop-color-chart', category: 'Ophthalmology', date: '2022-04-07' },
  { slug: 'therapeutic-injections-to-relieve-joint-pain', category: 'Orthopedic Injectables', date: '2022-04-07' },
  { slug: 'the-basics-of-dermal-fillers', category: 'Dermal Fillers', date: '2022-04-07' },
  { slug: 'botulinum-toxin-what-is-it-exactly', category: 'Botulinum Toxins', date: '2022-04-07' },
]

const BOIL = /informational purposes only|all brand names|toll free|save time and money|rights reserved|cookie|subscribe|provided for informational|cosmetic fillers botulinum/i

function decode(s) {
  return s
    .replace(/&#8217;|&#039;|&#39;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“').replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/gi, ' ')
}

async function grab(u) {
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(25000) })
  return await r.text()
}
function meta(html, prop) {
  const m = html.match(new RegExp('<meta[^>]+property=["\']' + prop + '["\'][^>]+content=["\']([^"\']+)', 'i'))
  return m ? m[1] : null
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // remove placeholder seeds
  await sb.from('blog_posts').delete().in('slug', ['how-ordering-works', 'cold-chain-for-injectables', 'manual-order-workflow', 'cold-chain-for-injectables'])

  for (const post of POSTS) {
    let html = await grab(`https://drsalesdirect.com/${post.slug}/`)
    const title = decode((meta(html, 'og:title') || '').replace(/\s*[-|]\s*Dr Sales Direct.*/i, '').trim())

    html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    let paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map(m => decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
      .filter(t => t.length > 40 && !BOIL.test(t))
    // drop trailing truncated sidebar excerpts (other posts) ending with ellipsis
    paras = paras.filter(t => !/(…|\.\.\.)\s*$/.test(t))
    // de-dupe, keep order
    paras = [...new Set(paras)]

    const body = paras.join('\n\n')
    const excerpt = (paras[0] || '').slice(0, 180)

    const { error } = await sb.from('blog_posts').upsert({
      slug: post.slug,
      title,
      excerpt,
      body: body || 'Read more on our blog.',
      is_published: true,
      published_at: new Date(post.date).toISOString(),
    }, { onConflict: 'slug' })

    console.log(error ? `✗ ${post.slug}: ${error.message}` : `✓ ${post.slug}  (${paras.length} paras, ${body.length} chars)`)
  }

  const { count } = await sb.from('blog_posts').select('id', { count: 'exact', head: true })
  console.log(`\nTotal blog posts now: ${count}`)
}
main().catch(e => { console.error(e); process.exit(1) })
