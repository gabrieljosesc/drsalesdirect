'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addSavedCard, deleteSavedCard, setDefaultSavedCard, type SavedCardRow } from '@/app/actions/saved-cards'
import { formatExpiryMmYyInput } from '@/lib/card-validation'

function formatCard(c: SavedCardRow) {
  const brand = c.brand ? c.brand.charAt(0).toUpperCase() + c.brand.slice(1) : 'Card'
  return `${brand} ···· ${c.last4} · ${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}`
}

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]'

function AddCardModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [expiryDisplay, setExpiryDisplay] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    start(async () => {
      const res = await addSavedCard(formData)
      if (!res.ok) { setError(res.message); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Add credit / debit card</h2>
          <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">✕</button>
        </div>
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-[#ec6a82]">
          For your protection, the full card number is encrypted on our servers. No payment is charged
          on this website — our team confirms payment with you directly.
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Card number</label>
            <input name="card_number" required autoComplete="cc-number" placeholder="4242 4242 4242 4242" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Expiry (MM/YY)</label>
              <input
                name="expiry" required autoComplete="cc-exp" placeholder="08/27"
                inputMode="numeric" maxLength={5} value={expiryDisplay}
                onChange={e => { setExpiryDisplay(formatExpiryMmYyInput(e.target.value)); setError(null) }}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">CVV (not stored)</label>
              <input name="cvv" autoComplete="cc-csc" placeholder="123" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Name on card</label>
            <input name="name_on_card" required autoComplete="cc-name" className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="set_default" className="size-4 rounded border-gray-400 accent-[#ec6a82]" />
            Set as default for checkout
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={pending} className="rounded-md bg-[#ec6a82] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d95672] disabled:opacity-60">
              {pending ? 'Saving…' : 'Save card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PaymentMethodsClient({ initialMethods }: { initialMethods: SavedCardRow[] }) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Add cards here to reuse them at checkout. Full numbers are encrypted and viewable only by
        authorized admin users when processing an approved order.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {initialMethods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-sm text-gray-600">You don&apos;t have cards yet.</p>
          <button type="button" onClick={() => setShowAdd(true)} className="mt-4 rounded-md bg-[#ec6a82] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d52f3c]">
            + Add new card
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Credit / debit card</h2>
            <button type="button" onClick={() => setShowAdd(true)} className="rounded-md bg-[#ec6a82] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d52f3c]">
              + Add new card
            </button>
          </div>
          <ul className="space-y-3">
            {initialMethods.map(c => (
              <li key={c.id} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatCard(c)}</p>
                  <p className="text-xs text-gray-500">{c.name_on_card}</p>
                  {c.is_default && (
                    <span className="mt-1 inline-block rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">Default</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {!c.is_default && (
                    <button
                      type="button" disabled={pending}
                      onClick={() => { setError(null); start(async () => { const r = await setDefaultSavedCard(c.id); if (!r.ok) setError(r.message); else router.refresh() }) }}
                      className="text-xs font-medium text-[#ec6a82] hover:underline disabled:opacity-50"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button" disabled={pending}
                    onClick={() => { setError(null); if (!window.confirm('Remove this card?')) return; start(async () => { const r = await deleteSavedCard(c.id); if (!r.ok) setError(r.message); else router.refresh() }) }}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAdd && <AddCardModal onClose={() => { setShowAdd(false); router.refresh() }} />}
    </div>
  )
}
