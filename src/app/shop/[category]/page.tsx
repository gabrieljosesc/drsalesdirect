import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { Product } from '@/types'
import ProductCard from '@/components/products/ProductCard'
import ShopSort from '@/components/products/ShopSort'
import Pagination from '@/components/products/Pagination'
import CategoryBanner from '@/components/products/CategoryBanner'
import Link from 'next/link'
import type { Metadata } from 'next'

const PAGE_SIZE = 20

interface Props {
  params: Promise<{ category: string }>
  searchParams: Promise<{ sort?: string; page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const supabase = createAdminClient()
  const { data } = await supabase.from('categories').select('name').eq('slug', category).single()
  if (!data) return {}
  return { title: data.name }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params
  const { sort = 'latest', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, parseInt(pageStr))
  const supabase = createAdminClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) notFound()

  const { data: subcategories } = await supabase
    .from('categories')
    .select('*')
    .eq('parent_id', category.id)
    .order('sort_order')

  let catIds = [category.id]
  if (subcategories && subcategories.length > 0) {
    catIds = [category.id, ...subcategories.map((s: { id: string }) => s.id)]
  }

  let query = supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(id,url,sort_order)', { count: 'exact' })
    .in('category_id', catIds)
    .eq('is_active', true)

  switch (sort) {
    case 'price_asc': query = query.order('base_price', { ascending: true }); break
    case 'price_desc': query = query.order('base_price', { ascending: false }); break
    default: query = query.order('created_at', { ascending: false })
  }

  const from = (page - 1) * PAGE_SIZE
  const { data: products, count } = await query.range(from, from + PAGE_SIZE - 1)
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <CategoryBanner slug={slug} name={category.name} description={category.description} count={count ?? 0} />
      </div>

      {/* Subcategory pills */}
      {subcategories && subcategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {subcategories.map((sub: { id: string; slug: string; name: string }) => (
            <Link
              key={sub.id}
              href={`/shop/${sub.slug}`}
              className="text-sm px-3 py-1.5 rounded-full border bg-white hover:bg-[#ec6a82] hover:text-white hover:border-[#ec6a82] transition-colors"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Showing {Math.min(from + 1, count ?? 0)}–{Math.min(from + PAGE_SIZE, count ?? 0)} of {count ?? 0}
        </p>
        <ShopSort currentSort={sort} />
      </div>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(products as Product[]).map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No products in this category yet.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination currentPage={page} totalPages={totalPages} />
        </div>
      )}
    </div>
  )
}
