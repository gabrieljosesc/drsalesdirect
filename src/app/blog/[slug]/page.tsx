import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { blogImage } from '@/lib/blog-images'
import { processBlogHtml } from '@/lib/blog-html'
import BlogToc from '@/components/blog/BlogToc'
import { Calendar, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data } = await supabase.from('blog_posts').select('title, excerpt').eq('slug', slug).single()
  if (!data) return {}
  return { title: data.title, description: data.excerpt ?? undefined }
}

function formatDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!post) notFound()

  const cover = post.image_url ?? blogImage(post.slug)
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(post.body ?? '')
  const { html, toc } = isHtml ? processBlogHtml(post.body ?? '') : { html: post.body ?? '', toc: [] }

  // Related articles: most recent others
  const { data: related } = await supabase
    .from('blog_posts')
    .select('slug, title, published_at, image_url')
    .eq('is_published', true)
    .neq('slug', slug)
    .order('published_at', { ascending: false })
    .limit(4)

  return (
    <div className="bg-gray-50/60">
      {/* Hero cover */}
      {cover && (
        <div className="relative h-[280px] md:h-[380px] w-full overflow-hidden bg-gray-900">
          <Image src={cover} alt={post.title} fill priority unoptimized className="object-cover opacity-90" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/85 via-gray-900/40 to-gray-900/10" />
          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto max-w-6xl px-4 pb-8">
              <Link href="/blog" className="text-sm text-white/80 hover:text-white">← Back to Blog</Link>
              <h1 className="mt-3 max-w-3xl text-3xl md:text-4xl font-bold leading-tight text-white">{post.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/75">
                <Calendar className="h-4 w-4" /> {formatDate(post.published_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
        {!cover && (
          <div className="mb-8">
            <Link href="/blog" className="text-sm text-[#ec6a82] hover:underline">← Back to Blog</Link>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900">{post.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="h-4 w-4" /> {formatDate(post.published_at)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* Article */}
          <article className="min-w-0">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 md:p-10 shadow-sm">
              {isHtml ? (
                <div
                  className="prose prose-gray max-w-none leading-relaxed
                    prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:text-gray-900
                    prose-h2:text-2xl prose-h2:mt-10 prose-h3:text-xl
                    prose-p:text-gray-700 prose-li:text-gray-700
                    prose-a:text-[#ec6a82] prose-a:no-underline hover:prose-a:underline
                    prose-img:w-full prose-img:rounded-xl prose-img:border prose-img:border-gray-100
                    prose-strong:text-gray-900
                    prose-table:block prose-table:overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <div className="prose prose-gray max-w-none whitespace-pre-wrap leading-relaxed text-gray-700">
                  {post.body}
                </div>
              )}
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <BlogToc entries={toc} />

            {related && related.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Related articles</p>
                <ul className="space-y-3">
                  {related.map((r) => {
                    const rc = r.image_url ?? blogImage(r.slug)
                    return (
                      <li key={r.slug}>
                        <Link href={`/blog/${r.slug}`} className="group flex gap-3">
                          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {rc && <Image src={rc} alt="" fill unoptimized className="object-cover" sizes="56px" />}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-medium text-gray-800 group-hover:text-[#ec6a82]">{r.title}</p>
                            <p className="mt-0.5 text-xs text-gray-400">{formatDate(r.published_at)}</p>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
                <Link href="/blog" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#ec6a82] hover:underline">
                  View all articles <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            <div className="rounded-2xl bg-gradient-to-br from-[#ec6a82] to-[#a94d61] p-5 text-white shadow-sm">
              <p className="text-sm font-semibold">Wholesale pricing for professionals</p>
              <p className="mt-1 text-sm text-white/85">Authentic products, tiered volume discounts, and cold-chain shipping.</p>
              <Link href="/shop" className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#ec6a82] hover:bg-gray-100">
                Browse Products <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
