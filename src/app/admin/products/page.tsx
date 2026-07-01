import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ q?: string }> }

function escapeIlike(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const svc = createAdminClient()

  let query = svc
    .from('products')
    .select('id, slug, title, sku, base_price, is_active, is_featured, category:categories(name)')
    .order('title')
    .limit(300)

  if (q) query = query.ilike('title', `%${escapeIlike(q)}%`)

  const { data: products } = await query

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products?.length ?? 0} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <form method="get" className="flex gap-2">
            <input
              type="search" name="q" defaultValue={q}
              placeholder="Search products…"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm w-56"
            />
            <button type="submit" className="rounded-md bg-[#ec6a82] px-3 py-2 text-sm font-medium text-white hover:bg-[#152f4a]">
              Search
            </button>
            {q && (
              <Link href="/admin/products" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Clear</Link>
            )}
          </form>
          <Link href="/admin/products/new" className="rounded-md bg-[#ec6a82] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d52f3c] whitespace-nowrap">
            + New
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-center">Featured</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map(p => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="font-medium text-[#ec6a82] hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{(p.category as { name?: string } | null)?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right">{p.base_price > 0 ? formatPrice(Number(p.base_price)) : '—'}</td>
                <td className="px-4 py-3 text-center">{p.is_active ? '✓' : <span className="text-gray-300">✗</span>}</td>
                <td className="px-4 py-3 text-center">{p.is_featured ? '★' : <span className="text-gray-300">—</span>}</td>
              </tr>
            ))}
            {(products ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No products found{q ? ` for "${q}"` : ''}.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
