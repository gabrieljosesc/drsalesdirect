'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendOrderReceivedEmail, sendAdminNewOrderEmail, type OrderEmailRow } from '@/lib/email/order-emails'
import { validateCoupon, recordCouponUse } from '@/app/actions/coupons'
import { computeShipping } from '@/lib/shipping'
import { meetsCheckoutMinimumUsd, MIN_CHECKOUT_SUBTOTAL_USD } from '@/lib/cart-minimum'
import { unitPriceForQuantity, parsePriceTiers } from '@/lib/price-tiers'
import { encryptCardCvv } from '@/lib/payment-card-crypto'

export type OrderAddressInput = {
  recipientName: string; company: string; phone: string
  line1: string; line2: string; city: string; state: string; zip: string; country: string
}

export type PlaceOrderInput = {
  shipping: OrderAddressInput
  /** Billing address; omit/null when it is the same as shipping. */
  billing?: OrderAddressInput | null
  items: { slug: string; quantity: number }[]
  /** Saved card — required for domestic orders; ignored for international. */
  cardId?: string | null
  cvv?: string
  couponCode?: string
  customerNotes?: string
  paymentNotes?: string
  policyAccepted?: boolean
  /**
   * International order (shipping/billing outside the US): no card is
   * captured — the team sends a secure payment link after verifying the
   * customer's government-issued photo ID (required upload).
   */
  international?: boolean
  idDocumentPath?: string
}

export type PlaceOrderResult = { ok: true; reference: string } | { ok: false; message: string }

function cardExpired(m: number, y: number) {
  return new Date(y, m, 0, 23, 59, 59, 999) < new Date()
}

/** Last order number on the old WordPress store — new orders continue from here. */
const ORDER_NUMBER_FLOOR = 109510

/**
 * Next sequential order number. Reads recent references ("109511" or imported
 * "WP-109506") and returns max + 1. A concurrent order can race to the same
 * number; the insert retries on the unique violation.
 */
/** jsonb shape stored in orders.shipping_address / orders.billing_address. */
function toAddressJson(a: OrderAddressInput) {
  return {
    first_name: a.recipientName, last_name: '', company: a.company,
    address_line1: a.line1, address_line2: a.line2,
    city: a.city, state: a.state, zip: a.zip, country: a.country, phone: a.phone,
  }
}

/**
 * First order in the system for this user ships free. Only non-cancelled
 * orders count, so a cancelled attempt does not consume the promo.
 */
export async function isFirstOrder(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const svc = createAdminClient()
  const { count } = await svc
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['pending_csr', 'confirmed', 'shipped'])
  return (count ?? 0) === 0
}

async function nextOrderNumber(svc: ReturnType<typeof createAdminClient>): Promise<number> {
  const { data } = await svc
    .from('orders')
    .select('reference_number')
    .order('created_at', { ascending: false })
    .limit(500)
  let max = ORDER_NUMBER_FLOOR
  for (const row of data ?? []) {
    const m = /(\d{6,})$/.exec(String(row.reference_number ?? ''))
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

/**
 * Server-authoritative order placement: recomputes prices, validates the
 * coupon, computes shipping, snapshots the chosen saved card, and encrypts
 * the per-order CVV. No payment is charged — the team processes it manually.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Please sign in to place an order.' }

  if (!input.items.length) return { ok: false, message: 'Your cart is empty.' }

  const international = Boolean(input.international)
  if (international) {
    // ID must exist and belong to this user (paths are {userId}/{file})
    if (!input.idDocumentPath || !input.idDocumentPath.startsWith(`${user.id}/`)) {
      return { ok: false, message: 'International orders require a valid government-issued photo ID. Please upload it to continue.' }
    }
  } else {
    if (!input.cardId) return { ok: false, message: 'Select a saved card before placing the order.' }
    if (!/^\d{3,4}$/.test((input.cvv ?? '').trim())) return { ok: false, message: 'Enter the 3–4 digit CVV from your card.' }
  }

  const svc = createAdminClient()

  // Profile (contact details for the order)
  const { data: profile } = await svc
    .from('profiles')
    .select('full_name, email, company')
    .eq('id', user.id)
    .single()

  // Recompute item prices server-side (authoritative)
  const slugs = input.items.map(i => i.slug)
  const { data: products } = await svc
    .from('products')
    .select('id, slug, title, base_price, price_tiers, is_active')
    .in('slug', slugs)
  const bySlug = new Map((products ?? []).map(p => [p.slug, p]))

  const orderItems: { product_id: string; title: string; quantity: number; unit_price: number }[] = []
  let subtotal = 0
  for (const item of input.items) {
    const p = bySlug.get(item.slug)
    if (!p || !p.is_active) return { ok: false, message: `A product in your cart is unavailable: ${item.slug}` }
    const qty = Math.max(1, Math.floor(item.quantity))
    const unit = unitPriceForQuantity(parsePriceTiers(p.price_tiers), qty, Number(p.base_price))
    subtotal += unit * qty
    orderItems.push({ product_id: p.id, title: p.title, quantity: qty, unit_price: unit })
  }
  if (subtotal <= 0) return { ok: false, message: 'Order total must be greater than zero.' }
  if (!meetsCheckoutMinimumUsd(subtotal)) {
    return { ok: false, message: `Minimum order is $${MIN_CHECKOUT_SUBTOTAL_USD.toFixed(2)}. Add more items before checking out.` }
  }

  // Coupon (server-validated)
  let couponCode: string | null = null
  let discount = 0
  if (input.couponCode?.trim()) {
    const res = await validateCoupon(input.couponCode, subtotal)
    if (res.ok) { couponCode = res.code; discount = Math.min(res.discount, subtotal) }
  }

  // First order ships free; later orders pay flat rate below the threshold
  const { count: priorOrders } = await svc
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['pending_csr', 'confirmed', 'shipped'])
  const firstOrder = (priorOrders ?? 0) === 0

  const shippingAmount = computeShipping(subtotal - discount, firstOrder)
  const total = Math.max(0, subtotal - discount) + shippingAmount

  // Card snapshot + encrypted CVV (domestic orders only — international
  // orders are paid through a secure payment link after ID verification)
  let paymentCardSnapshot: Record<string, unknown> | null = null
  if (!international) {
    const { data: card } = await svc
      .from('user_saved_cards')
      .select('id, brand, last4, exp_month, exp_year, name_on_card, pan_encrypted')
      .eq('id', input.cardId!)
      .eq('user_id', user.id)
      .single()
    if (!card) return { ok: false, message: 'Saved card not found. Please add a card on file.' }
    if (cardExpired(card.exp_month, card.exp_year)) {
      return { ok: false, message: 'Your saved card is expired. Please update it.' }
    }

    let cvvEncrypted: string
    try {
      cvvEncrypted = encryptCardCvv((input.cvv ?? '').trim())
    } catch {
      return { ok: false, message: 'Payment processing is not configured. Contact support.' }
    }
    paymentCardSnapshot = {
      brand: card.brand, last4: card.last4,
      exp_month: card.exp_month, exp_year: card.exp_year,
      name_on_card: card.name_on_card, cvv_encrypted: cvvEncrypted,
      pan_encrypted: card.pan_encrypted ?? null,
    }
  }

  const s = input.shipping
  // Billing defaults to the shipping address so every order records both
  const billing = input.billing ?? s
  if (!billing.recipientName.trim() || !billing.line1.trim()) {
    return { ok: false, message: 'Complete the billing address (name and street address are required).' }
  }

  let referenceNumber = await nextOrderNumber(svc)
  let order: { id: string } | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await svc
      .from('orders')
      .insert({
        user_id: user.id,
        reference_number: String(referenceNumber),
        status: 'pending_csr',
        subtotal,
        coupon_code: couponCode,
        discount_amount: discount,
        shipping_amount: shippingAmount,
        total,
        email: profile?.email ?? user.email ?? '',
        full_name: profile?.full_name ?? s.recipientName,
        phone: s.phone || null,
        shipping_address: toAddressJson(s),
        billing_address: toAddressJson(billing),
        customer_notes: input.customerNotes || null,
        payment_notes: input.paymentNotes || null,
        policy_acknowledged_at: input.policyAccepted ? new Date().toISOString() : null,
        payment_card_snapshot: paymentCardSnapshot,
        payment_method: international ? 'payment_link' : 'card',
        requires_id_verification: international,
        id_document_path: international ? input.idDocumentPath : null,
      })
      .select('id')
      .single()

    if (data) { order = data; break }
    // 23505 = unique violation: another order claimed this number concurrently
    if (error?.code === '23505') { referenceNumber++; continue }
    return { ok: false, message: error?.message ?? 'Could not place order.' }
  }

  if (!order) return { ok: false, message: 'Could not place order. Please try again.' }
  const reference = String(referenceNumber)

  await svc.from('order_items').insert(orderItems.map(it => ({ ...it, order_id: order.id })))

  if (couponCode) void recordCouponUse(couponCode)
  // Await so the SMTP send completes before the serverless function freezes.
  // notifyNewOrder never throws, so a mail failure can't break the order.
  await notifyNewOrder(order.id)

  return { ok: true, reference }
}

/**
 * Fire-and-forget notifications after an order is placed: emails the customer
 * an "order received" confirmation and alerts the admin of the new order.
 * Safe to call from the client checkout flow — never throws.
 */
export async function notifyNewOrder(orderId: string): Promise<void> {
  try {
    const svc = createAdminClient()
    const { data: order } = await svc
      .from('orders')
      .select('id, reference_number, email, full_name, phone, status, subtotal, coupon_code, discount_amount, shipping_amount, total, shipping_address, billing_address, order_items(title, quantity, unit_price)')
      .eq('id', orderId)
      .single()
    if (!order) return

    const row = order as unknown as OrderEmailRow
    const results = await Promise.allSettled([
      sendOrderReceivedEmail(row),
      sendAdminNewOrderEmail(row),
    ])
    results.forEach((r, i) => {
      const which = i === 0 ? 'customer' : 'admin'
      if (r.status === 'rejected') console.error(`[notifyNewOrder] ${which} email failed:`, r.reason)
      else if (!r.value.ok) console.error(`[notifyNewOrder] ${which} email not sent:`, r.value.error)
    })
  } catch (e) {
    console.error('[notifyNewOrder]', e)
  }
}
