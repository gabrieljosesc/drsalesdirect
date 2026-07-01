import 'server-only'

import { sendTransactionalEmail, type SendEmailResult } from '@/lib/email/send'

const SITE_EMAIL = process.env.NOTIFICATION_EMAIL?.trim() || 'info@drsalesdirect.com'
const SITE_PHONE = '+1-855-843-4782'
// Emails are read outside the app, so links must be absolute and public —
// never localhost. Ignore a dev/misconfigured NEXT_PUBLIC_SITE_URL.
const RAW_SITE = process.env.NEXT_PUBLIC_SITE_URL?.trim()
const SITE_URL = RAW_SITE && !/localhost|127\.0\.0\.1/.test(RAW_SITE)
  ? RAW_SITE
  : 'https://drsalesdirect.com'

export type OrderStatus = 'pending_csr' | 'confirmed' | 'shipped' | 'cancelled'

export type OrderEmailAddress = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
  phone?: string | null
}

export type OrderEmailRow = {
  id: string
  reference_number?: string | null
  email: string
  full_name: string
  phone?: string | null
  status: OrderStatus
  subtotal: number | string
  coupon_code?: string | null
  discount_amount?: number | string | null
  shipping_amount?: number | string | null
  total?: number | string | null
  shipping_address?: OrderEmailAddress | null
  billing_address?: OrderEmailAddress | null
  order_items?: { title: string; quantity: number; unit_price: number | string }[] | null
}

function ref(o: OrderEmailRow) { return o.reference_number || o.id.slice(0, 8).toUpperCase() }
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function money(n: number | string) { return `$${Number(n).toFixed(2)}` }

function layout(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
    <table width="100%" style="max-width:540px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
      <tr><td style="background:#ec6a82;padding:18px 24px;color:#fff;font-size:18px;font-weight:700;">Dr Sales Direct</td></tr>
      <tr><td style="padding:24px;color:#18181b;font-size:15px;line-height:1.55;">${body}</td></tr>
      <tr><td style="padding:16px 24px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#71717a;line-height:1.5;">
        Questions? <a href="mailto:${SITE_EMAIL}" style="color:#ec6a82;">${SITE_EMAIL}</a> · ${SITE_PHONE}<br>
        <a href="${SITE_URL}" style="color:#ec6a82;">${SITE_URL}</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

function itemsTable(o: OrderEmailRow): string {
  const items = Array.isArray(o.order_items) ? o.order_items : []
  if (!items.length) return ''
  const rows = items.map(it =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(it.title)} × ${it.quantity}</td>
      <td style="padding:6px 0;border-bottom:1px solid #f3f4f6;text-align:right;">${money(Number(it.unit_price) * it.quantity)}</td></tr>`
  ).join('')

  const discount = Number(o.discount_amount ?? 0)
  const shipping = Number(o.shipping_amount ?? 0)
  const grand = o.total != null ? Number(o.total) : Number(o.subtotal) - discount + shipping

  let summary = `<tr><td style="padding:8px 0 2px;">Subtotal</td><td style="padding:8px 0 2px;text-align:right;">${money(o.subtotal)}</td></tr>`
  if (discount > 0) {
    const label = o.coupon_code ? `Discount (${escapeHtml(o.coupon_code)})` : 'Discount'
    summary += `<tr><td style="padding:2px 0;color:#15803d;">${label}</td><td style="padding:2px 0;text-align:right;color:#15803d;">−${money(discount)}</td></tr>`
  }
  summary += `<tr><td style="padding:2px 0;">Shipping</td><td style="padding:2px 0;text-align:right;">${shipping > 0 ? money(shipping) : 'Free'}</td></tr>`
  summary += `<tr><td style="padding:8px 0;font-weight:700;border-top:1px solid #e5e7eb;">Total</td><td style="padding:8px 0;text-align:right;font-weight:700;border-top:1px solid #e5e7eb;">${money(grand)}</td></tr>`

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">${rows}${summary}</table>`
}

function addressLines(a: OrderEmailAddress): string {
  return [
    `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim(),
    a.company,
    a.address_line1,
    a.address_line2,
    [a.city, a.state, a.zip].filter(Boolean).join(', '),
    a.country,
    a.phone,
  ].filter(v => v && String(v).trim()).map(v => escapeHtml(String(v))).join('<br>')
}

/** Billing + shipping addresses side by side (like the old WordPress emails). */
function addressesBlock(o: OrderEmailRow): string {
  const shipping = o.shipping_address && o.shipping_address.address_line1 ? o.shipping_address : null
  const billing = (o.billing_address && o.billing_address.address_line1 ? o.billing_address : null) ?? shipping
  if (!shipping && !billing) return ''

  const cell = (title: string, a: OrderEmailAddress) =>
    `<td valign="top" width="50%" style="padding:0 8px 0 0;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ec6a82;">${title}</p>
      <p style="margin:0;font-size:13px;color:#3f3f46;line-height:1.5;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;">${addressLines(a)}</p>
    </td>`

  const cells = [
    billing ? cell('Billing address', billing) : '',
    shipping ? cell('Shipping address', shipping) : '',
  ].join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 4px;"><tr>${cells}</tr></table>`
}

// ── Customer: order received ────────────────────────────────────────────────
export async function sendOrderReceivedEmail(o: OrderEmailRow): Promise<SendEmailResult> {
  const name = escapeHtml(o.full_name.trim() || 'there')
  const body = `<p style="margin:0 0 12px;">Hi ${name},</p>
    <p style="margin:0 0 12px;">Thank you for your order! Your order has been received and is being processed.</p>
    <p style="margin:0 0 4px;"><strong>Reference:</strong> ${escapeHtml(ref(o))}</p>
    ${itemsTable(o)}
    ${addressesBlock(o)}
    <p style="margin:12px 0 0;">You can view this order anytime in your account.</p>`
  return sendTransactionalEmail({
    to: o.email,
    subject: `Order received — ${ref(o)}`,
    html: layout(body),
    text: `Hi ${o.full_name}, your order ${ref(o)} has been received and is being processed. Total: ${money(o.subtotal)}.`,
  })
}

// ── Admin: new order alert ──────────────────────────────────────────────────
export async function sendAdminNewOrderEmail(o: OrderEmailRow): Promise<SendEmailResult> {
  const body = `<p style="margin:0 0 12px;"><strong>New order received.</strong></p>
    <p style="margin:0 0 4px;"><strong>Reference:</strong> ${escapeHtml(ref(o))}</p>
    <p style="margin:0 0 4px;"><strong>Customer:</strong> ${escapeHtml(o.full_name)} (${escapeHtml(o.email)})${o.phone ? ` · ${escapeHtml(o.phone)}` : ''}</p>
    ${itemsTable(o)}
    ${addressesBlock(o)}
    <p style="margin:12px 0 0;"><a href="${SITE_URL}/admin/orders/${o.id}" style="color:#ec6a82;">Open in admin →</a></p>`
  // ADMIN_NOTIFY_EMAILS: comma-separated extra inboxes (e.g. a Gmail copy)
  const extraEmails = (process.env.ADMIN_NOTIFY_EMAILS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return sendTransactionalEmail({
    to: [SITE_EMAIL, ...extraEmails],
    subject: `New order ${ref(o)} — ${money(o.subtotal)}`,
    html: layout(body),
    text: `New order ${ref(o)} from ${o.full_name} (${o.email}). Total ${money(o.subtotal)}. ${SITE_URL}/admin/orders/${o.id}`,
  })
}

// ── Customer: status change ─────────────────────────────────────────────────
const STATUS_COPY: Record<OrderStatus, { subject: string; line: string } | null> = {
  pending_csr: null,
  confirmed: { subject: 'Your order is confirmed', line: 'Good news — your order has been <strong>confirmed</strong>. Our team will be in touch with payment and shipping details.' },
  shipped: { subject: 'Your order has shipped', line: 'Your order is on its way — it has been marked as <strong>shipped</strong>.' },
  cancelled: { subject: 'Your order was cancelled', line: 'Your order has been <strong>cancelled</strong>. If this is unexpected, please contact us.' },
}

export async function sendOrderStatusEmail(o: OrderEmailRow, status: OrderStatus): Promise<void> {
  const copy = STATUS_COPY[status]
  if (!copy) return
  const name = escapeHtml(o.full_name.trim() || 'there')
  const body = `<p style="margin:0 0 12px;">Hi ${name},</p>
    <p style="margin:0 0 12px;">${copy.line}</p>
    <p style="margin:0 0 4px;"><strong>Reference:</strong> ${escapeHtml(ref(o))}</p>
    ${itemsTable(o)}
    ${addressesBlock(o)}`
  await sendTransactionalEmail({
    to: o.email,
    subject: `${copy.subject} — ${ref(o)}`,
    html: layout(body),
  })
}
