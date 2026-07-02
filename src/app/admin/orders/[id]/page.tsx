import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { updateOrderAction } from '@/app/actions/admin'
import { OrderItemsEditor } from './order-items-editor'
import { formatPrice } from '@/lib/utils'
import { decryptCardCvv, decryptCardPan } from '@/lib/payment-card-crypto'
import type { ShippingAddress } from '@/types'

type CardSnapshot = {
  brand?: string | null
  last4?: string
  exp_month?: number
  exp_year?: number
  name_on_card?: string
  cvv_encrypted?: string
  pan_encrypted?: string | null
}

function formatPan(pan: string): string {
  return pan.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}

function statusLabel(s: string) {
  return { pending_csr: 'Pending review', confirmed: 'Confirmed', shipped: 'Shipped', cancelled: 'Cancelled' }[s] ?? s
}
function statusColor(s: string) {
  return {
    pending_csr: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-700',
  }[s] ?? 'bg-gray-100 text-gray-600'
}

function formatAddress(a: ShippingAddress | null): string {
  if (!a) return '—'
  return [
    a.company,
    `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim(),
    a.address_line1,
    a.address_line2,
    [a.city, a.state, a.zip].filter(Boolean).join(', '),
    a.country,
    a.phone,
  ].filter(Boolean).join('\n')
}

export default async function AdminOrderDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const svc = createAdminClient()

  const { data: order } = await svc
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single()
  if (!order) notFound()

  // Look up customer's license info from their profile (if registered)
  let license: {
    license_holder_name?: string; license_number?: string
    license_expiry?: string; profession?: string; license_state?: string
  } | null = null
  if (order.user_id) {
    const { data: prof } = await svc
      .from('profiles')
      .select('license_holder_name, license_number, license_expiry, profession, license_state')
      .eq('id', order.user_id)
      .single()
    license = prof
  }

  const items = Array.isArray(order.order_items) ? order.order_items : []
  const shipping = order.shipping_address as ShippingAddress | null
  const billing = (order.billing_address ?? null) as ShippingAddress | null
  const hasBilling = Boolean(billing?.address_line1)

  // Resolve full card number for manual processing (admin-only page).
  // Newer orders store the encrypted PAN in the snapshot; for older orders we
  // fall back to the customer's saved card matched on last4.
  const card = order.payment_card_snapshot as CardSnapshot | null
  let cardPanEncrypted = card?.pan_encrypted ?? null
  if (!cardPanEncrypted && order.user_id && card?.last4) {
    const { data: savedCard } = await svc
      .from('user_saved_cards')
      .select('pan_encrypted')
      .eq('user_id', order.user_id)
      .eq('last4', card.last4)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    cardPanEncrypted = savedCard?.pan_encrypted ?? null
  }
  let cardFullNumber: string | null = null
  if (cardPanEncrypted) {
    try { cardFullNumber = formatPan(decryptCardPan(cardPanEncrypted)) } catch { cardFullNumber = null }
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/orders" className="text-sm text-[#ec6a82] hover:underline">← Orders</Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.reference_number ?? ''}</h1>
          <p className="mt-0.5 text-xs text-gray-400 font-mono">{order.id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(order.status)}`}>
          {statusLabel(order.status)}
        </span>
      </div>

      {sp.saved && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">Order updated.</p>}
      {sp.error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(sp.error)}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Customer */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</h2>
          <p className="mt-2 font-semibold text-gray-900">{order.full_name || '—'}</p>
          <p className="text-sm text-gray-600">{order.email}</p>
          {order.phone && <p className="text-sm text-gray-600">{order.phone}</p>}
          <p className="mt-1 text-xs text-gray-400">Placed: {new Date(order.created_at).toLocaleString()}</p>
          <p className="mt-0.5 text-xs">
            {order.policy_acknowledged_at ? (
              <span className="text-green-700">Policy acknowledged · {new Date(order.policy_acknowledged_at).toLocaleString()}</span>
            ) : (
              <span className="text-amber-700">Policy acknowledgement not recorded</span>
            )}
          </p>
          {!order.user_id && <p className="mt-1 text-xs text-amber-600">Guest order (no account)</p>}
        </section>

        {/* License */}
        <section className="rounded-xl border border-[#ec6a82]/20 bg-blue-50/50 p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#ec6a82]">Medical License</h2>
          <div className="mt-2 space-y-1 text-sm">
            <p><span className="text-gray-500">Name:</span> <span className="text-gray-900">{license?.license_holder_name ?? '—'}</span></p>
            <p><span className="text-gray-500">License Type:</span> <span className="text-gray-900">{license?.profession ?? '—'}</span></p>
            <p><span className="text-gray-500">License #:</span> <span className="font-mono text-gray-900">{license?.license_number ?? '—'}</span></p>
            <p><span className="text-gray-500">Expiry:</span> <span className="text-gray-900">{license?.license_expiry ? String(license.license_expiry).slice(0, 10) : '—'}</span></p>
            <p><span className="text-gray-500">State issued:</span> <span className="text-gray-900">{license?.license_state ?? '—'}</span></p>
          </div>
        </section>

        {/* Billing / Shipping */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Billing Address</h2>
          <address className="mt-2 not-italic text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {hasBilling ? formatAddress(billing) : 'Same as shipping (not recorded separately)'}
          </address>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shipping Address</h2>
          <address className="mt-2 not-italic text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {formatAddress(shipping)}
          </address>
        </section>

        {/* Payment card (for manual processing) */}
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm sm:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-700">Payment Card (process manually)</h2>
          {(() => {
            if (!card || !card.last4) {
              return <p className="mt-2 text-sm text-gray-500">No card captured for this order.</p>
            }
            let cvv = '—'
            try { cvv = card.cvv_encrypted ? decryptCardCvv(card.cvv_encrypted) : '—' } catch { cvv = 'decrypt error' }
            return (
              <div className="mt-2 text-sm text-gray-800 space-y-1">
                <p>
                  <span className="text-gray-500">Card number:</span>{' '}
                  {cardFullNumber
                    ? <span className="font-mono font-semibold tracking-wide">{cardFullNumber}</span>
                    : <span className="text-gray-500">Not available — only last 4 on file: ···· {card.last4}</span>}
                </p>
                <p><span className="text-gray-500">Brand:</span> {(card.brand ?? 'Card').toUpperCase()}</p>
                <p><span className="text-gray-500">Expiry:</span> {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}</p>
                <p><span className="text-gray-500">Name on card:</span> {card.name_on_card ?? '—'}</p>
                <p><span className="text-gray-500">CVV:</span> <span className="font-mono font-semibold">{cvv}</span></p>
                <p className="text-xs text-amber-700 mt-1">Full card details are decrypted for manual processing and visible to admins only. CVV shown here is for this order only.</p>
              </div>
            )
          })()}
        </section>
      </div>

      {/* Notes */}
      {order.customer_notes && (
        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer Notes</h2>
          <p className="mt-2 text-sm text-gray-700">{order.customer_notes}</p>
        </section>
      )}

      {/* Items (editable) */}
      <OrderItemsEditor
        orderId={order.id}
        initialItems={items.map((it: { product_id: string | null; title: string; quantity: number; unit_price: number }) => ({
          product_id: it.product_id ?? null,
          title: it.title,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        }))}
        initialShipping={Number(order.shipping_amount ?? 0)}
        discount={Number(order.discount_amount ?? 0)}
      />

      {/* Update form */}
      <form action={updateOrderAction} className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Update Order</h2>
        <input type="hidden" name="id" value={order.id} />
        <div>
          <label className="text-xs font-medium text-gray-600">Status</label>
          <select name="status" defaultValue={order.status} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]">
            <option value="pending_csr">Pending review</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Admin notes (internal — not visible to customer)</label>
          <textarea name="admin_notes" rows={3} defaultValue={order.admin_notes ?? ''} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]" />
        </div>
        <button type="submit" className="rounded-md bg-[#ec6a82] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#d95672]">
          Update Order
        </button>
      </form>
    </div>
  )
}
