import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { upsertBlogPostAction } from '@/app/actions/admin'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}

const inputClass = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]'
const labelClass = 'text-xs font-medium text-gray-600'

export default async function AdminEditBlogPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const svc = createAdminClient()

  const { data: post } = await svc.from('blog_posts').select('*').eq('id', id).single()
  if (!post) notFound()

  return (
    <div className="max-w-2xl">
      <Link href="/admin/blog" className="text-sm text-[#ec6a82] hover:underline">← Blog</Link>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Edit Blog Post</h1>

      {sp.saved && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">Post saved.</p>}
      {sp.error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(sp.error)}</p>}

      <form action={upsertBlogPostAction} className="mt-6 space-y-4">
        <input type="hidden" name="id" value={post.id} />
        <div>
          <label className={labelClass}>Title</label>
          <input name="title" required defaultValue={post.title} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Slug</label>
          <input name="slug" required defaultValue={post.slug} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Excerpt</label>
          <input name="excerpt" defaultValue={post.excerpt ?? ''} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Body (Markdown supported)</label>
          <textarea name="body" rows={12} required defaultValue={post.body} className={inputClass} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={post.is_published} className="accent-[#ec6a82]" /> Published
        </label>
        <button type="submit" className="rounded-md bg-[#ec6a82] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#152f4a]">
          Save Post
        </button>
      </form>
    </div>
  )
}
