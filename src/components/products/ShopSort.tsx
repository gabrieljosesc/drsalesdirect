'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const sortOptions = [
  { value: 'latest', label: 'Sort by latest' },
  { value: 'popularity', label: 'Sort by popularity' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

export default function ShopSort({ currentSort }: { currentSort: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleSort(value: string | null) {
    if (!value) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', value)
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={currentSort} onValueChange={handleSort}>
      <SelectTrigger className="w-44 h-9 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
