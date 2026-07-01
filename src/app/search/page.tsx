import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchShopProducts } from '@/lib/shop-products'
import { Product } from '@/types'
import ProductCard from '@/components/products/ProductCard'
import ShopSort from '@/components/products/ShopSort'
import Pagination from '@/components/products/Pagination'
import { Search as SearchIcon } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Search' }

const PAGE_SIZE = 20

type SearchParams = Record<string, string | string[] | undefined>
function one(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const q = (one(params.q) ?? '').trim()
  const sort = one(params.sort) ?? 'latest'
  const page = Math.max(1, parseInt(one(params.page) ?? '1'))

  const supabase = createAdminClient()

  const { products, count } = q.length >= 2
    ? await fetchShopProducts(supabase, { search: q, sort, page, pageSize: PAGE_SIZE })
    : { products: [] as Product[], count: 0 }

  const from = (page - 1) * PAGE_SIZE
  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {q ? <>Search results for &ldquo;{q}&rdquo;</> : 'Search'}
        </h1>
        {q.length >= 2 && <p className="text-sm text-gray-500 mt-1">{count} {count === 1 ? 'product' : 'products'} found</p>}
      </div>

      {q.length < 2 ? (
        <div className="text-center py-20 text-gray-400">
          <SearchIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">Start typing to search</p>
          <p className="text-sm mt-1">Enter at least two characters, or <Link href="/shop" className="text-[#ec6a82] hover:underline">browse all products</Link>.</p>
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Showing {from + 1}–{Math.min(from + PAGE_SIZE, count)} of {count} results
            </p>
            <ShopSort currentSort={sort} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination currentPage={page} totalPages={totalPages} />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No products found for &ldquo;{q}&rdquo;</p>
          <p className="text-sm mt-1">Try different keywords or <Link href="/shop" className="text-[#ec6a82] hover:underline">browse categories</Link>.</p>
        </div>
      )}
    </div>
  )
}
