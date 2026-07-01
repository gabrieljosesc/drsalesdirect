'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { Category } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { X } from 'lucide-react'

interface Props {
  categories: Category[]
  currentParams: Record<string, string | undefined>
}

export default function ShopFilters({ categories, currentParams }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [minPrice, setMinPrice] = useState(currentParams.min_price ?? '')
  const [maxPrice, setMaxPrice] = useState(currentParams.max_price ?? '')

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = { ...currentParams, ...overrides, page: '1' }
    const qs = Object.entries(p)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join('&')
    return `${pathname}${qs ? `?${qs}` : ''}`
  }

  function applyPriceFilter() {
    router.push(buildUrl({ min_price: minPrice || undefined, max_price: maxPrice || undefined }))
  }

  function clearAll() {
    setMinPrice('')
    setMaxPrice('')
    router.push(pathname)
  }

  const hasFilters = Object.values(currentParams).some(v => v)

  return (
    <div className="bg-white rounded-lg border p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Filters</h2>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-red-500 hover:underline flex items-center gap-1">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      <Separator />

      {/* Price range */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Price Range (USD)</h3>
        <div className="flex gap-2 mb-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={applyPriceFilter}>
          Apply
        </Button>
      </div>

      <Separator />

      {/* Categories */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Category</h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => router.push(buildUrl({
                category: currentParams.category === cat.slug ? undefined : cat.slug
              }))}
              className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-50 transition-colors ${
                currentParams.category === cat.slug ? 'text-[#ec6a82] font-medium bg-blue-50' : 'text-gray-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
