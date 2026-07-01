'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending_csr', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function OrdersFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeStatus = searchParams.get('status') ?? ''
  const [search, setSearch] = useState(searchParams.get('q') ?? '')

  function navigate(status: string, q: string) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (q.trim()) params.set('q', q.trim())
    const qs = params.toString()
    router.push(qs ? `/account/orders?${qs}` : '/account/orders')
  }

  return (
    <div className="mb-5 space-y-3">
      <form
        onSubmit={e => {
          e.preventDefault()
          navigate(activeStatus, search)
        }}
        className="relative max-w-sm"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by reference number…"
          className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => navigate(t.value, search)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
              activeStatus === t.value
                ? 'bg-[#ec6a82] text-white border-[#ec6a82]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
