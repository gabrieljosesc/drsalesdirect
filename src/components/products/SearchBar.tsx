'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/utils'

type Suggestion = {
  id: string
  slug: string
  title: string
  base_price: number
  image: string | null
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback((q: string) => {
    abortRef.current?.abort()
    if (q.trim().length < 2) {
      setSuggestions([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    fetch(`/api/search-suggest?q=${encodeURIComponent(q.trim())}`, { signal: controller.signal })
      .then(res => res.json())
      .then((data: { suggestions: Suggestion[] }) => {
        setSuggestions(data.suggestions ?? [])
        setHighlighted(-1)
        setLoading(false)
      })
      .catch(err => {
        if (err?.name !== 'AbortError') setLoading(false)
      })
  }, [])

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchSuggestions])

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function goToShop(q: string) {
    setOpen(false)
    setQuery('')
    setSuggestions([])
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  function goToProduct(slug: string) {
    setOpen(false)
    setQuery('')
    setSuggestions([])
    router.push(`/product/${slug}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (highlighted >= 0 && suggestions[highlighted]) {
      goToProduct(suggestions[highlighted].slug)
      return
    }
    const q = query.trim()
    if (q) goToShop(q)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => (h + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => (h <= 0 ? suggestions.length - 1 : h - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products, brands..."
          className="pl-9 pr-9 bg-gray-50 border-gray-200 focus:bg-white"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {suggestions.length > 0 ? (
            <>
              <ul role="listbox">
                {suggestions.map((s, i) => (
                  <li key={s.id} role="option" aria-selected={i === highlighted}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlighted(i)}
                      onClick={() => goToProduct(s.slug)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        i === highlighted ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {s.image ? (
                          <Image src={s.image} alt="" fill className="object-cover" sizes="40px" unoptimized />
                        ) : (
                          <Search className="absolute inset-0 m-auto w-4 h-4 text-gray-300" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{s.title}</span>
                      <span className="flex-shrink-0 text-sm font-semibold text-[#ec6a82]">
                        {formatPrice(s.base_price)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => goToShop(query.trim())}
                className="block w-full border-t border-gray-100 bg-gray-50 px-3 py-2.5 text-center text-sm font-medium text-[#ec6a82] hover:bg-gray-100 transition-colors"
              >
                View all results for &ldquo;{query.trim()}&rdquo; →
              </button>
            </>
          ) : (
            !loading && (
              <p className="px-3 py-4 text-center text-sm text-gray-400">
                No products found for &ldquo;{query.trim()}&rdquo;
              </p>
            )
          )}
        </div>
      )}
    </div>
  )
}
