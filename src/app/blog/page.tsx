import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { blogImage } from '@/lib/blog-images'
import { Award } from 'lucide-react'

export const metadata: Metadata = { title: 'Blog' }
export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const supabase = createAdminClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, published_at, image_url')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
        <p className="text-gray-500 mt-2">Updates on medical news and discoveries.</p>
      </div>

      {!posts || posts.length === 0 ? (
        <p className="text-center text-gray-400 py-16">No posts yet. Check back soon.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => {
            const cover = post.image_url ?? blogImage(post.slug)
            return (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-[16/9] bg-gradient-to-br from-[#ec6a82]/10 to-[#2a5a8c]/5 flex items-center justify-center overflow-hidden">
                {cover ? (
                  <Image src={cover} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:768px) 100vw, 33vw" unoptimized />
                ) : (
                  <Award className="w-10 h-10 text-[#ec6a82]/30" />
                )}
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-400 mb-2">
                  {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                </p>
                <h2 className="font-semibold text-gray-800 group-hover:text-[#ec6a82] leading-snug mb-2">{post.title}</h2>
                {post.excerpt && <p className="text-sm text-gray-500 line-clamp-3">{post.excerpt}</p>}
              </div>
            </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
