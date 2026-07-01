import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminBlogPage() {
  const svc = createAdminClient()
  const { data: posts } = await svc
    .from('blog_posts')
    .select('id, slug, title, is_published, published_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
        <Link href="/admin/blog/new" className="rounded-md bg-[#ec6a82] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d52f3c]">
          + New Post
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3 text-center">Published</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {(posts ?? []).map(p => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/blog/${p.id}`} className="font-medium text-[#ec6a82] hover:underline">{p.title}</Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.slug}</td>
                <td className="px-4 py-3 text-center">
                  {p.is_published
                    ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Live</span>
                    : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Draft</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(posts ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No blog posts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
