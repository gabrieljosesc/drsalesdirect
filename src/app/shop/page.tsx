import { createAdminClient } from '@/lib/supabase/server'
import { fetchShopProducts } from '@/lib/shop-products'
import { Product, Category } from '@/types'
import ProductCard from '@/components/products/ProductCard'
import ShopFilters from '@/components/products/ShopFilters'
import ShopSort from '@/components/products/ShopSort'
import Pagination from '@/components/products/Pagination'

const PAGE_SIZE = 20

type SearchParams = Record<string, string | string[] | undefined>

function getString(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0]
  return val
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const search = getString(params.search)
  const category = getString(params.category)
  const min_price = getString(params.min_price)
  const max_price = getString(params.max_price)
  const sort = getString(params.sort) ?? 'latest'
  const page = Math.max(1, parseInt(getString(params.page) ?? '1'))

  const supabase = createAdminClient()

  const { products, count } = await fetchShopProducts(supabase, {
    search,
    category,
    min_price,
    max_price,
    sort,
    page,
    pageSize: PAGE_SIZE,
  })

  const from = (page - 1) * PAGE_SIZE
  const totalPages = Math.ceil(count / PAGE_SIZE)

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')

  const currentParams: Record<string, string | undefined> = {
    search, category, min_price, max_price, sort,
    page: page > 1 ? String(page) : undefined,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {search ? `Search results for "${search}"` : 'All Products'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{count} products found</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-64 flex-shrink-0">
          <ShopFilters
            categories={(categories as Category[]) ?? []}
            currentParams={currentParams}
          />
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Showing {count === 0 ? 0 : from + 1}–{Math.min(from + PAGE_SIZE, count)} of {count} results
            </p>
            <ShopSort currentSort={sort} />
          </div>

          {products && products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {(products as Product[]).map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination currentPage={page} totalPages={totalPages} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
