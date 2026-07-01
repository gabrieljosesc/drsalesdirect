/**
 * Reproduce the notifyNewOrder pipeline for a real order, step by step,
 * to find why no emails went out. Run: node scripts/debug-order-email.mjs <reference>
 */
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true })

const reference = process.argv[2] ?? '109511'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// 1. The exact select notifyNewOrder runs
const { data: order, error } = await sb
  .from('orders')
  .select('id, reference_number, email, full_name, phone, status, subtotal, coupon_code, discount_amount, shipping_amount, total, shipping_address, billing_address, order_items(title, quantity, unit_price)')
  .eq('reference_number', reference)
  .single()

console.log('STEP 1 — select:', error ? `FAILED: ${error.message}` : 'ok')
if (!order) process.exit(1)
console.log('  order id:', order.id, '| email:', order.email)

// 2. Template build (same logic as order-emails.ts addressesBlock)
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function addressLines(a) {
  return [
    `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim(),
    a.company, a.address_line1, a.address_line2,
    [a.city, a.state, a.zip].filter(Boolean).join(', '),
    a.country, a.phone,
  ].filter(v => v && String(v).trim()).map(v => escapeHtml(String(v))).join('<br>')
}
try {
  const shipping = order.shipping_address && order.shipping_address.address_line1 ? order.shipping_address : null
  const billing = (order.billing_address && order.billing_address.address_line1 ? order.billing_address : null) ?? shipping
  console.log('STEP 2 — template: ok | shipping lines:', addressLines(shipping ?? {}).split('<br>').length, '| billing present:', Boolean(billing))
} catch (e) {
  console.log('STEP 2 — template THREW:', e.message)
}

// 3. Real SMTP send of a small test email to the customer + admin inboxes
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST.trim(),
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: Number(process.env.SMTP_PORT ?? 465) === 465,
  auth: { user: process.env.SMTP_USER.trim(), pass: process.env.SMTP_PASS },
})
const to = [order.email, process.env.NOTIFICATION_EMAIL]
try {
  const info = await transporter.sendMail({
    from: `Dr Sales Direct <${process.env.NOTIFICATION_EMAIL}>`,
    to,
    subject: `[debug] email pipeline test for order ${reference}`,
    text: 'If you can read this, SMTP from local works end to end.',
  })
  console.log('STEP 3 — SMTP send: ok', info.messageId, '| accepted:', info.accepted, '| rejected:', info.rejected)
} catch (e) {
  console.log('STEP 3 — SMTP send FAILED:', e.message)
}
