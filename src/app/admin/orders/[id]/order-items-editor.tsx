'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { saveOrderItemsAction } from '@/app/actions/admin'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Search, Loader2 } from 'lucide-react'

type EditorItem = { key: string; product_id: string | null; title: string; quantity: number; unit_price: number }
type Suggestion = { id: string; slug: string; title: string; base_price: number; image: string | null }
type InitialItem = { product_id: string | null; title: string; quantity: number; unit_price: number }

let _k = 0
const newKey = () => `r${_k++}`

export function OrderItemsEditor({ orderId, initialItems, initialShipping, discount }: {
  orderId: string
  initialItems: InitialItem[]
  initialShipping: number
  discount: number
}) {
  const [items, setItems] = useState<EditorItem[]>(() => initialItems.map(i => ({ ...i, key: newKey() })))
  const [shipping, setShipping] = useState(initialShipping)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const total = Math.max(0, subtotal - discount) + (Number(shipping) || 0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        setResults(data.suggestions ?? [])
      } catch { /* ignore */ } finally { setSearching(false) }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  function addProduct(s: Suggestion) {
    setItems(prev => [...prev, { key: newKey(), product_id: s.id, title: s.title, quantity: 1, unit_price: s.base_price }])
    setQuery(''); setResults([])
    setMsg(null)
  }
  const updateItem = (key: string, patch: Partial<EditorItem>) =>
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)))
  const removeItem = (key: string) => { setItems(prev => prev.filter(i => i.key !== key)); setMsg(null) }

  function save() {
    setMsg(null)
    startTransition(async () => {
      const res = await saveOrderItemsAction({
        orderId,
        items: items.map(({ product_id, title, quantity, unit_price }) => ({ product_id, title, quantity, unit_price })),
        shippingAmount: Number(shipping) || 0,
      })
      setMsg(res.ok ? { ok: true, text: 'Order saved.' } : { ok: false, text: res.message ?? 'Save failed.' })
    })
  }

  return (
    <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Items (editable)</h2>
        <span className="text-xs text-gray-400">Adjust quantity or price, add or remove products.</span>
      </div>

      <div className="mt-3 divide-y divide-gray-100">
        {items.length === 0 && <p className="py-3 text-sm text-gray-400">No items — add a product below.</p>}
        {items.map(it => (
          <div key={it.key} className="flex flex-wrap items-center gap-3 py-2">
            <span className="min-w-0 flex-1 text-sm text-gray-800">{it.title}</span>
            <label className="flex items-center gap-1 text-xs text-gray-500">Qty
              <Input type="number" min={1} value={it.quantity}
                onChange={e => updateItem(it.key, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                className="w-16 h-8" />
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-500">$
              <Input type="number" min={0} step="0.01" value={it.unit_price}
                onChange={e => updateItem(it.key, { unit_price: Math.max(0, Number(e.target.value) || 0) })}
                className="w-24 h-8" />
            </label>
            <span className="w-20 text-right text-sm font-medium text-gray-900">{formatPrice(it.quantity * it.unit_price)}</span>
            <button type="button" onClick={() => removeItem(it.key)} aria-label="Remove item" className="text-gray-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Add a product — search by name…" className="pl-9" />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
        {results.length > 0 && (
          <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border bg-white shadow-lg max-h-60 overflow-auto">
            {results.map(r => (
              <button key={r.id} type="button" onClick={() => addProduct(r)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                <span className="min-w-0 truncate text-gray-800">{r.title}</span>
                <span className="flex flex-shrink-0 items-center gap-2 text-gray-500">{formatPrice(r.base_price)}<Plus className="w-3.5 h-3.5" /></span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
        {discount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>−{formatPrice(discount)}</span></div>}
        <div className="flex items-center justify-between text-gray-600">
          <span>Shipping</span>
          <label className="flex items-center gap-1">$
            <Input type="number" min={0} step="0.01" value={shipping}
              onChange={e => setShipping(Math.max(0, Number(e.target.value) || 0))} className="w-24 h-8 text-right" />
          </label>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-1.5 font-semibold text-gray-900"><span>Total</span><span>{formatPrice(total)}</span></div>
      </div>

      {msg && <p className={`mt-3 text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
      <Button type="button" onClick={save} disabled={pending} className="mt-3 bg-[#ec6a82] hover:bg-[#152f4a]">
        {pending ? 'Saving…' : 'Save Order Changes'}
      </Button>
    </section>
  )
}
