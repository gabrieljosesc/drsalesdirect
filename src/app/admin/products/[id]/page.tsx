import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { updateProductAction } from '@/app/actions/admin'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}

const inputClass = 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]'
const labelClass = 'text-xs font-medium text-gray-600'

export default async function AdminProductEditPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const svc = createAdminClient()

  const { data: product } = await svc
    .from('products')
    .select('*, product_images(url), category:categories(id,name)')
    .eq('id', id)
    .single()
  if (!product) notFound()

  const { data: categories } = await svc.from('categories').select('id,name').order('sort_order')
  const img = Array.isArray(product.product_images) ? product.product_images[0]?.url : ''

  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="text-sm text-[#ec6a82] hover:underline">← Products</Link>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Edit Product</h1>

      {sp.saved && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">Product saved.</p>}
      {sp.error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(sp.error)}</p>}

      <form action={updateProductAction} className="mt-6 space-y-4">
        <input type="hidden" name="id" value={product.id} />
        <div>
          <label className={labelClass}>Title</label>
          <input name="title" required defaultValue={product.title} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Slug</label>
            <input name="slug" required defaultValue={product.slug} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>SKU</label>
            <input name="sku" defaultValue={product.sku ?? ''} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Category</label>
            <select name="category_id" defaultValue={product.category_id ?? ''} className={inputClass}>
              <option value="">—</option>
              {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Base Price (USD)</label>
            <input name="base_price" type="number" step="0.01" required defaultValue={product.base_price} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea name="description" rows={8} defaultValue={product.description ?? ''} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Primary Image URL</label>
          <input name="image_url" defaultValue={img ?? ''} placeholder="https://…" className={inputClass} />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={product.is_active} className="accent-[#ec6a82]" /> Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_featured" defaultChecked={product.is_featured} className="accent-[#ec6a82]" /> Featured
          </label>
        </div>
        <button type="submit" className="rounded-md bg-[#ec6a82] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#152f4a]">
          Save Changes
        </button>
      </form>
    </div>
  )
}
