'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { productUnitPrice } from '@/lib/price-tiers'
import { computeShipping, SHIPPING_RATES_TEXT } from '@/lib/shipping'
import { meetsCheckoutMinimumUsd } from '@/lib/cart-minimum'
import { CartMinimumBar } from '@/components/CartMinimumBar'
import { placeOrder, isFirstOrder } from '@/app/actions/orders'
import { validateCoupon } from '@/app/actions/coupons'
import { createClient } from '@/lib/supabase/client'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import type { ParsedAddress } from '@/lib/parse-google-place'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ShoppingCart, Tag, X, CreditCard } from 'lucide-react'

type SavedCard = { id: string; brand: string | null; last4: string; exp_month: number; exp_year: number; name_on_card: string; is_default: boolean }
type SavedAddress = { id: string; label: string | null; recipient_name: string; phone: string | null; line1: string; line2: string | null; city: string | null; state: string | null; postal_code: string | null; country: string | null; is_default: boolean }

type Shipping = { recipientName: string; company: string; phone: string; line1: string; line2: string; city: string; state: string; zip: string; country: string }

const emptyShipping: Shipping = { recipientName: '', company: '', phone: '', line1: '', line2: '', city: '', state: '', zip: '', country: '' }

function cardExpired(c: { exp_month: number; exp_year: number }) {
  return new Date(c.exp_year, c.exp_month, 0, 23, 59, 59, 999) < new Date()
}
function cardLabel(c: SavedCard) {
  return `${c.brand ? c.brand.toUpperCase() : 'Card'} ···· ${c.last4} · exp ${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}`
}
function shippingLine(s: Shipping) {
  return [
    `${s.recipientName}${s.phone ? ` · ${s.phone}` : ''}`.trim(),
    s.line1, s.line2.trim() || null,
    [s.city, s.state, s.zip].filter(Boolean).join(', '),
    s.country,
  ].filter(Boolean).join(' · ')
}

export default function CheckoutPage() {
  const { items, selectedItems, selectedTotal, clearSelected } = useCart()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [prefilling, setPrefilling] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [contact, setContact] = useState({ fullName: '', email: '', company: '', license: '' })
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null)
  const [shipping, setShipping] = useState<Shipping>(emptyShipping)
  const [useDifferent, setUseDifferent] = useState(false)
  const [billingSame, setBillingSame] = useState(true)
  const [billing, setBilling] = useState<Shipping>(emptyShipping)
  const [firstOrder, setFirstOrder] = useState(false)

  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [cvv, setCvv] = useState('')

  const [customerNotes, setCustomerNotes] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  const usableCards = useMemo(() => savedCards.filter(c => !cardExpired(c)), [savedCards])
  const selectedCard = usableCards.find(c => c.id === selectedCardId) ?? usableCards[0] ?? null
  const hasUsableCard = usableCards.length > 0

  // Checkout operates on SELECTED cart lines only (same as MedicaPlanet)
  const total = selectedTotal
  const minimumMet = meetsCheckoutMinimumUsd(total)
  const discount = coupon ? Math.min(coupon.discount, total) : 0
  const shippingAmount = computeShipping(total - discount, firstOrder)
  const grandTotal = Math.max(0, total - discount) + shippingAmount

  function applySaved(a: SavedAddress) {
    setShipping({
      recipientName: a.recipient_name, company: '', phone: a.phone ?? '',
      line1: a.line1, line2: a.line2 ?? '', city: a.city ?? '',
      state: a.state ?? '', zip: a.postal_code ?? '', country: a.country ?? '',
    })
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !mounted) return
        const [{ data: profile }, { data: addrs }, cardRes, firstOrderRes] = await Promise.all([
          supabase.from('profiles').select('full_name, email, company, phone, address_line1, city, state, postal_code, country, license_number').eq('id', user.id).single(),
          supabase.from('user_addresses').select('id,label,recipient_name,phone,line1,line2,city,state,postal_code,country,is_default').eq('user_id', user.id).order('is_default', { ascending: false }),
          supabase.from('user_saved_cards').select('id,brand,last4,exp_month,exp_year,name_on_card,is_default').eq('user_id', user.id).order('is_default', { ascending: false }),
          isFirstOrder().catch(() => false),
        ])
        if (!mounted) return
        setFirstOrder(firstOrderRes)

        setContact({
          fullName: profile?.full_name ?? '', email: profile?.email ?? user.email ?? '',
          company: profile?.company ?? '', license: profile?.license_number ?? '',
        })

        const list = (addrs ?? []) as SavedAddress[]
        setSavedAddresses(list)
        if (list.length > 0) {
          const def = list.find(a => a.is_default) ?? list[0]
          setSelectedAddrId(def.id); applySaved(def)
        } else if (profile?.address_line1) {
          setShipping({
            recipientName: profile.full_name ?? '', company: profile.company ?? '', phone: profile.phone ?? '',
            line1: profile.address_line1 ?? '', line2: '', city: profile.city ?? '',
            state: profile.state ?? '', zip: profile.postal_code ?? '', country: profile.country ?? '',
          })
        }

        const cards = (cardRes.error ? [] : cardRes.data ?? []) as SavedCard[]
        setSavedCards(cards)
        const active = cards.filter(c => !cardExpired(c))
        setSelectedCardId((active.find(c => c.is_default) ?? active[0] ?? null)?.id ?? null)
      } finally {
        if (mounted) setPrefilling(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  function handleAddrSelect(p: ParsedAddress) {
    setShipping(s => ({ ...s, line1: p.line1, city: p.city, state: p.state, zip: p.postalCode, ...(p.country ? { country: p.country } : {}) }))
  }

  async function applyCoupon() {
    const code = couponInput.trim()
    if (!code) return
    setCouponLoading(true)
    try {
      const res = await validateCoupon(code, total)
      if (res.ok) { setCoupon({ code: res.code, discount: res.discount }); setCouponInput(''); toast.success(`Coupon ${res.code} applied`) }
      else toast.error(res.error)
    } finally { setCouponLoading(false) }
  }

  const missingShipping = [
    ['recipient name', shipping.recipientName], ['phone', shipping.phone], ['address', shipping.line1],
    ['city', shipping.city], ['state', shipping.state], ['ZIP', shipping.zip], ['country', shipping.country],
  ].filter(([, v]) => !String(v).trim()).map(([l]) => l)

  const missingBilling = billingSame ? [] : [
    ['name', billing.recipientName], ['address', billing.line1],
    ['city', billing.city], ['state', billing.state], ['ZIP', billing.zip], ['country', billing.country],
  ].filter(([, v]) => !String(v).trim()).map(([l]) => l)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedCard) { setError('Add a non-expired card on file before placing this order.'); return }
    if (missingShipping.length) { setError(`Complete the shipping address: ${missingShipping.join(', ')}.`); return }
    if (missingBilling.length) { setError(`Complete the billing address: ${missingBilling.join(', ')}.`); return }
    if (cvv.trim().length < 3) { setError('Enter the CVV from your card.'); return }
    if (!minimumMet) { setError('Minimum order not reached. Add more items before checking out.'); return }
    if (!policyAccepted) { setError('Please confirm the professional-use acknowledgement.'); return }

    setLoading(true)
    const res = await placeOrder({
      shipping,
      billing: billingSame ? null : billing,
      items: selectedItems.map(i => ({ slug: i.product.slug, quantity: i.quantity })),
      cardId: selectedCard.id,
      cvv: cvv.trim(),
      couponCode: coupon?.code,
      customerNotes,
      paymentNotes: paymentNotes.trim() || undefined,
      policyAccepted,
    })
    setLoading(false)
    if (!res.ok) { setError(res.message); toast.error(res.message); return }
    clearSelected()
    router.push(`/order-confirmed?ref=${res.reference}`)
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h1>
        <Link href="/shop" className={cn(buttonVariants(), 'bg-[#ec6a82] hover:bg-[#152f4a]')}>Browse Products</Link>
      </div>
    )
  }

  if (selectedItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">No items selected</h1>
        <p className="text-gray-500 mb-6">Go back to your cart and select the product(s) you want to order.</p>
        <Link href="/cart" className={cn(buttonVariants(), 'bg-[#ec6a82] hover:bg-[#152f4a]')}>Back to Cart</Link>
      </div>
    )
  }

  if (prefilling) {
    return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-500">Loading your checkout details…</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Blocking modal when no usable card */}
      {!hasUsableCard && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900">Update card information</h2>
            <p className="mt-2 text-sm text-gray-600">
              You need a non-expired credit card on file before placing an order.{' '}
              {savedCards.length > 0 ? 'The card saved on your account appears to be expired.' : 'No saved card was found on your account.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/account/payment-methods" className={cn(buttonVariants(), 'bg-[#ec6a82] hover:bg-[#152f4a]')}>Manage cards</Link>
              <Link href="/cart" className={cn(buttonVariants({ variant: 'outline' }))}>Back to cart</Link>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800">Checkout</h1>
      <p className="mt-2 text-sm text-gray-500 max-w-2xl">
        Review your order below. We use the information from your account profile and saved address —
        you only need to change the shipping address if this order should go somewhere else.
      </p>
      <p className="mt-2 text-xs text-gray-400">
        By submitting, you agree to our{' '}
        <Link href="/legal/terms" className="underline hover:no-underline">Terms of Service</Link>,{' '}
        <Link href="/legal/shipping-cold-chain" className="underline hover:no-underline">Shipping &amp; Cold-Chain Policy</Link>, and{' '}
        <Link href="/legal/returns" className="underline hover:no-underline">Return policy</Link>.
      </p>

      {/* Minimum-order progress (selected items) */}
      <div className="mt-6">
        <CartMinimumBar amountUsd={total} />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid lg:grid-cols-[1fr_22rem] gap-6">
        <div className="space-y-5">
          {/* Review & submit */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Review &amp; submit</h2>
                <p className="mt-1 text-xs text-gray-500">Confirm your details, shipping address, and payment card.</p>
              </div>
              <Link href="/account/profile" className="text-xs font-medium text-[#ec6a82] hover:underline">Edit profile</Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Client</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{contact.fullName || 'Missing name'}</p>
                <p className="text-sm text-gray-600">{contact.email || 'Missing email'}</p>
                <p className="text-xs text-gray-500">Company: {contact.company || 'Not provided'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">License</p>
                <p className="mt-1 text-sm text-gray-700">License #: {contact.license || 'Not provided'}</p>
              </div>

              {/* Shipping */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shipping address</p>
                    <p className="mt-1 text-sm text-gray-700">{shippingLine(shipping) || 'Missing shipping address'}</p>
                  </div>
                  <Link href="/account/addresses" className="text-xs font-medium text-[#ec6a82] hover:underline whitespace-nowrap">Manage addresses</Link>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={useDifferent} onChange={e => setUseDifferent(e.target.checked)} className="size-4 rounded border-gray-400 accent-[#ec6a82]" />
                  <span>Different shipping address</span>
                </label>
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={billingSame}
                    onChange={e => {
                      setBillingSame(e.target.checked)
                      // Seed the billing form from shipping the first time it opens
                      if (!e.target.checked && !billing.line1.trim()) setBilling(shipping)
                    }}
                    className="size-4 rounded border-gray-400 accent-[#ec6a82]"
                  />
                  <span>Billing address is the same as shipping</span>
                </label>
              </div>

              {/* Payment card */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment card</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      {selectedCard ? cardLabel(selectedCard) : 'No valid card on file'}
                    </p>
                    {selectedCard && <p className="text-xs text-gray-500">Name on card: {selectedCard.name_on_card}</p>}
                  </div>
                  <Link href="/account/payment-methods" className="text-xs font-medium text-[#ec6a82] hover:underline whitespace-nowrap">Manage cards</Link>
                </div>

                {usableCards.length > 1 && (
                  <select
                    value={selectedCard?.id ?? ''}
                    onChange={e => setSelectedCardId(e.target.value || null)}
                    className="mt-3 w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {usableCards.map(c => <option key={c.id} value={c.id}>{cardLabel(c)}{c.is_default ? ' (Default)' : ''}</option>)}
                  </select>
                )}

                {selectedCard && (
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-600">CVV / Security code <span className="text-red-500">*</span></label>
                    <input
                      type="password" inputMode="numeric" maxLength={4} value={cvv}
                      onChange={e => setCvv(e.target.value.replace(/\D/g, ''))}
                      placeholder="3–4 digits" autoComplete="cc-csc"
                      className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Different shipping address */}
          {useDifferent && (
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Different shipping address</h2>
              {savedAddresses.length > 0 && (
                <div className="mt-3">
                  <label className="text-xs font-medium text-gray-600">Start from a saved address</label>
                  <select
                    value={selectedAddrId ?? ''}
                    onChange={e => { const a = savedAddresses.find(x => x.id === e.target.value); if (a) { setSelectedAddrId(a.id); applySaved(a) } }}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {savedAddresses.map(a => <option key={a.id} value={a.id}>{(a.label ? `${a.label} — ` : '') + a.recipient_name}{a.is_default ? ' (Default)' : ''}</option>)}
                  </select>
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Recipient name</label><Input value={shipping.recipientName} onChange={e => setShipping(s => ({ ...s, recipientName: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">Phone</label><Input value={shipping.phone} onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))} className="mt-1" /></div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600">Address line 1</label>
                  <div className="mt-1"><AddressAutocomplete name="ship_line1" value={shipping.line1} onChange={v => setShipping(s => ({ ...s, line1: v }))} onAddressSelect={handleAddrSelect} placeholder="123 Main St" /></div>
                </div>
                <div className="sm:col-span-2"><label className="text-xs font-medium text-gray-600">Address line 2 (optional)</label><Input value={shipping.line2} onChange={e => setShipping(s => ({ ...s, line2: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">City</label><Input value={shipping.city} onChange={e => setShipping(s => ({ ...s, city: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">State / province</label><Input value={shipping.state} onChange={e => setShipping(s => ({ ...s, state: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">ZIP / postal code</label><Input value={shipping.zip} onChange={e => setShipping(s => ({ ...s, zip: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">Country</label><Input value={shipping.country} onChange={e => setShipping(s => ({ ...s, country: e.target.value }))} className="mt-1" /></div>
              </div>
            </section>
          )}

          {/* Billing address (when different from shipping) */}
          {!billingSame && (
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Billing address</h2>
              <p className="mt-1 text-xs text-gray-500">The address associated with your payment card.</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Name</label><Input value={billing.recipientName} onChange={e => setBilling(b => ({ ...b, recipientName: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">Phone</label><Input value={billing.phone} onChange={e => setBilling(b => ({ ...b, phone: e.target.value }))} className="mt-1" /></div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600">Address line 1</label>
                  <div className="mt-1"><AddressAutocomplete name="bill_line1" value={billing.line1} onChange={v => setBilling(b => ({ ...b, line1: v }))} onAddressSelect={p => setBilling(b => ({ ...b, line1: p.line1, city: p.city, state: p.state, zip: p.postalCode, ...(p.country ? { country: p.country } : {}) }))} placeholder="123 Main St" /></div>
                </div>
                <div className="sm:col-span-2"><label className="text-xs font-medium text-gray-600">Address line 2 (optional)</label><Input value={billing.line2} onChange={e => setBilling(b => ({ ...b, line2: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">City</label><Input value={billing.city} onChange={e => setBilling(b => ({ ...b, city: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">State / province</label><Input value={billing.state} onChange={e => setBilling(b => ({ ...b, state: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">ZIP / postal code</label><Input value={billing.zip} onChange={e => setBilling(b => ({ ...b, zip: e.target.value }))} className="mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-600">Country</label><Input value={billing.country} onChange={e => setBilling(b => ({ ...b, country: e.target.value }))} className="mt-1" /></div>
              </div>
            </section>
          )}

          {/* Order notes */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900">Order notes</p>
            <p className="mt-1 text-xs text-gray-500">No card is charged at submit. Once your order is approved, our team processes payment using your card on file.</p>
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-600">Order notes</label>
              <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} rows={3} placeholder="Any special instructions…" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82] resize-none" />
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-600">Payment / callback notes (optional)</label>
              <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} rows={2} placeholder="Best time to call, billing contact, PO number…" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82] resize-none" />
            </div>
          </section>

          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              required
              checked={policyAccepted}
              onChange={e => setPolicyAccepted(e.target.checked)}
              className="mt-0.5 size-4 rounded border-gray-400 accent-[#ec6a82]"
            />
            <span>I confirm this purchase is for authorized professional use and that product handling at delivery will follow required storage and local regulatory standards.</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" disabled={loading || !hasUsableCard || !minimumMet} className="bg-[#ec6a82] hover:bg-[#152f4a]">
            {loading ? 'Placing Order…' : 'Place Order'}
          </Button>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Your Order</h2>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {selectedItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm gap-2">
                  <span className="text-gray-600 line-clamp-2">{item.product.title} × {item.quantity}</span>
                  <span className="font-medium flex-shrink-0">{formatPrice(productUnitPrice(item.product, item.quantity) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator className="mb-4" />

            {coupon ? (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-green-800"><Tag className="w-3.5 h-3.5" /> {coupon.code}</span>
                <button type="button" onClick={() => setCoupon(null)} className="text-green-700 hover:text-green-900" aria-label="Remove coupon"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="mb-4 flex gap-2">
                <Input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" className="font-mono uppercase" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }} />
                <Button type="button" variant="outline" disabled={couponLoading || !couponInput.trim()} onClick={applyCoupon} className="flex-shrink-0">{couponLoading ? '...' : 'Apply'}</Button>
              </div>
            )}

            <div className="space-y-1.5 text-sm mb-3">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-700"><span>Discount ({coupon?.code})</span><span>−{formatPrice(discount)}</span></div>}
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{shippingAmount === 0 ? <span className="font-medium text-green-700">Free</span> : formatPrice(shippingAmount)}</span></div>
              {firstOrder && shippingAmount === 0 && <p className="text-xs text-green-700">Complimentary shipping — your first order ships free.</p>}
              <p className="text-xs text-gray-500">{SHIPPING_RATES_TEXT}</p>
            </div>
            <Separator className="mb-3" />
            <div className="flex justify-between font-bold text-gray-900"><span>Total</span><span>{formatPrice(grandTotal)}</span></div>
          </div>
        </aside>
      </form>
    </div>
  )
}
