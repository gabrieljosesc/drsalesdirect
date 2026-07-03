import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { blogImage } from '@/lib/blog-images'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data } = await supabase.from('blog_posts').select('title, excerpt').eq('slug', slug).single()
  if (!data) return {}
  return { title: data.title, description: data.excerpt ?? undefined }
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
  // Old plain-text/markdown seeds have no HTML tags; render those as pre-wrap.
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(post.body ?? '')

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/blog" className="text-sm text-[#ec6a82] hover:underline">← Back to Blog</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">{post.title}</h1>
      <p className="text-sm text-gray-400 mb-6">
        {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
      </p>
      {cover && (
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8">
          <Image src={cover} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 768px" priority unoptimized />
        </div>
      )}
      {isHtml ? (
        <div
          className="prose prose-gray max-w-none leading-relaxed text-gray-700 prose-headings:text-gray-900 prose-a:text-[#ec6a82] prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />
      ) : (
        <div className="prose prose-gray max-w-none whitespace-pre-wrap leading-relaxed text-gray-700">
          {post.body}
        </div>
      )}
    </article>
  )
}
