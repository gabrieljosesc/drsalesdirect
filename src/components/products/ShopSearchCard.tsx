'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type Suggestion = {
  id: string
  slug: string
  title: string
  base_price: number
  image: string | null
}

const LIVE_FILTER_DEBOUNCE_MS = 380
const SUGGEST_DEBOUNCE_MS = 200

/**
 * Search card for the shop page: the product grid live-filters as you type
 * (URL `search` param), with title suggestions after 2+ letters.
 */
export default function ShopSearchCard() {
  const router = useRouter()
  const sp = useSearchParams()
  const urlSearch = sp.get('search') ?? ''
  const category = sp.get('category')

  const [draft, setDraft] = useState(urlSearch)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  const push = useCallback(
    (q: string) => {
      const next = new URLSearchParams(sp.toString())
      if (q) next.set('search', q)
      else next.delete('search')
      next.delete('page')
      const qs = next.toString()
      router.push(qs ? `/shop?${qs}` : '/shop', { scroll: false })
    },
    [router, sp]
  )

  // Live filter: URL tracks the input (debounced)
  useEffect(() => {
    const next = draft.trim()
    if (next === urlSearch.trim()) return
    const id = setTimeout(() => push(next), LIVE_FILTER_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [draft, urlSearch, push])

  // Suggestions
  useEffect(() => {
    const q = draft.trim()
    if (q.length < 2) {
      setSuggestions([])
      setLoading(false)
      setHighlight(-1)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`, { signal: ac.signal })
        const data = (await res.json()) as { suggestions?: Suggestion[] }
        setSuggestions(data.suggestions ?? [])
        setHighlight(-1)
      } catch {
        if (!ac.signal.aborted) setSuggestions([])
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    }, SUGGEST_DEBOUNCE_MS)
    return () => {
      clearTimeout(t)
      ac.abort()
    }
  }, [draft])

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (s: Suggestion) => {
    setOpen(false)
    router.push(`/product/${s.slug}`)
  }

  const showDropdown = open && draft.trim().length >= 2

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <label htmlFor="shop-search" className="text-xs font-medium text-gray-600">
        {category ? 'Search in category' : 'Search products'}
      </label>
      <div ref={wrapRef} className="relative mt-1 max-w-md">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              id="shop-search"
              type="search"
              autoComplete="off"
              value={draft}
              onChange={e => {
                setDraft(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (highlight >= 0 && suggestions[highlight]) pick(suggestions[highlight])
                  else {
                    push(draft.trim())
                    setOpen(false)
                  }
                  return
                }
                if (e.key === 'Escape') { setOpen(false); return }
                if (!showDropdown || suggestions.length === 0) return
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setHighlight(h => (h + 1 >= suggestions.length ? 0 : h + 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setHighlight(h => (h <= 0 ? suggestions.length - 1 : h - 1))
                }
              }}
              placeholder="Product name…"
              role="combobox"
              aria-expanded={showDropdown}
              aria-autocomplete="list"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#ec6a82] focus:ring-1 focus:ring-[#ec6a82]"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          <button
            type="button"
            onClick={() => { push(draft.trim()); setOpen(false) }}
            className="shrink-0 rounded-md bg-[#ec6a82] px-4 py-2 text-sm font-medium text-white hover:bg-[#d95672] transition-colors"
          >
            Search
          </button>
        </div>

        {showDropdown && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {loading && suggestions.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500">Searching…</p>
            )}
            {!loading && suggestions.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500">No matching products.</p>
            )}
            <ul className="max-h-72 overflow-y-auto py-0.5" role="listbox">
              {suggestions.map((s, i) => (
                <li key={s.id} role="option" aria-selected={highlight === i}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pick(s)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      highlight === i ? 'bg-rose-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {s.image ? (
                        <Image src={s.image} alt="" fill className="object-contain" sizes="36px" unoptimized />
                      ) : (
                        <Search className="absolute inset-0 m-auto w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{s.title}</span>
                    {s.base_price > 0 && (
                      <span className="flex-shrink-0 text-sm font-semibold text-[#ec6a82]">
                        {formatPrice(s.base_price)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-gray-500">
        Results update as you type; suggestions appear after 2+ letters.
      </p>
    </div>
  )
}
