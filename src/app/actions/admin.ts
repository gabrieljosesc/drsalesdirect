'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendOrderStatusEmail, type OrderEmailRow, type OrderStatus } from '@/lib/email/order-emails'

// ── Admin guard ─────────────────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/admin')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/')
  return { supabase, user }
}

export type AdminResult = { ok: true; message: string } | { ok: false; message: string }

// ── Products ────────────────────────────────────────────────────────────────
export async function updateProductAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()
  const id = String(formData.get('id'))
  const title = String(formData.get('title'))
  const slug = String(formData.get('slug'))
  const description = String(formData.get('description') || '')
  const sku = String(formData.get('sku') || '')
  const base_price = Number(formData.get('base_price'))
  const category_id = String(formData.get('category_id') || '') || null
  const is_active = formData.get('is_active') === 'on'
  const is_featured = formData.get('is_featured') === 'on'
  const image_url = String(formData.get('image_url') || '').trim()

  const { error } = await supabase
    .from('products')
    .update({ title, slug, description, sku, base_price, category_id, is_active, is_featured })
    .eq('id', id)

  if (error) redirect(`/admin/products/${id}?error=${encodeURIComponent(error.message)}`)

  if (image_url) {
    const { data: imgs } = await supabase.from('product_images').select('id').eq('product_id', id).limit(1)
    if (imgs?.[0]) {
      await supabase.from('product_images').update({ url: image_url }).eq('id', imgs[0].id)
    } else {
      await supabase.from('product_images').insert({ product_id: id, url: image_url, sort_order: 0 })
    }
  }

  revalidatePath('/')
  revalidatePath('/admin/products')
  revalidatePath(`/product/${slug}`)
  redirect(`/admin/products/${id}?saved=1`)
}

export async function createProductAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()
  const title = String(formData.get('title'))
  const slug = String(formData.get('slug'))
  const description = String(formData.get('description') || '')
  const sku = String(formData.get('sku') || '')
  const base_price = Number(formData.get('base_price'))
  const category_id = String(formData.get('category_id') || '') || null
  const is_active = formData.get('is_active') === 'on'
  const is_featured = formData.get('is_featured') === 'on'
  const image_url = String(formData.get('image_url') || '').trim()

  const { data, error } = await supabase
    .from('products')
    .insert({ title, slug, description, sku, base_price, price_tiers: [], category_id, is_active, is_featured })
    .select('id')
    .single()

  if (error) redirect(`/admin/products/new?error=${encodeURIComponent(error.message)}`)

  if (image_url && data) {
    await supabase.from('product_images').insert({ product_id: data.id, url: image_url, sort_order: 0 })
  }

  revalidatePath('/admin/products')
  redirect(`/admin/products/${data.id}?saved=1`)
}

// ── Orders ──────────────────────────────────────────────────────────────────
export async function updateOrderAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()
  const id = String(formData.get('id'))
  const status = String(formData.get('status'))
  const admin_notes = String(formData.get('admin_notes') || '')

  // Detect status change to decide whether to email the customer
  const { data: before } = await supabase.from('orders').select('status').eq('id', id).single()
  const previousStatus = before?.status as OrderStatus | undefined

  const { error } = await supabase
    .from('orders')
    .update({ status, admin_notes })
    .eq('id', id)

  if (error) redirect(`/admin/orders/${id}?error=${encodeURIComponent(error.message)}`)

  // Email the customer when the status actually changes
  if (previousStatus && previousStatus !== status) {
    const svc = createAdminClient()
    const { data: order } = await svc
      .from('orders')
      .select('id, reference_number, email, full_name, phone, status, subtotal, coupon_code, discount_amount, shipping_amount, total, shipping_address, billing_address, order_items(title, quantity, unit_price)')
      .eq('id', id)
      .single()
    if (order) {
      // Await so the SMTP send completes before the serverless function freezes.
      try {
        await sendOrderStatusEmail(order as unknown as OrderEmailRow, status as OrderStatus)
      } catch (e) {
        console.error('[updateOrderAction] status email failed:', e)
      }
    }
  }

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${id}`)
  redirect(`/admin/orders/${id}?saved=1`)
}

export type OrderItemInput = { product_id: string | null; title: string; quantity: number; unit_price: number }

/**
 * Admin order editing: replace an order's line items (add/remove/edit price &
 * quantity), the shipping amount, and optionally a manual discount, then
 * recompute subtotal and total. When discountAmount is omitted the existing
 * (coupon) discount is preserved. No customer email is sent — the admin
 * notifies separately via the status update if/when they choose to.
 */
export async function saveOrderItemsAction(input: {
  orderId: string
  items: OrderItemInput[]
  shippingAmount: number
  discountAmount?: number
}): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin()
  const svc = createAdminClient()

  const clean = (input.items ?? [])
    .map(i => ({
      product_id: i.product_id || null,
      title: String(i.title ?? '').trim(),
      quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
      unit_price: Math.max(0, Number(i.unit_price) || 0),
    }))
    .filter(i => i.title)

  if (!clean.length) return { ok: false, message: 'An order must have at least one item.' }

  const { data: order, error: oErr } = await svc.from('orders').select('discount_amount').eq('id', input.orderId).single()
  if (oErr || !order) return { ok: false, message: 'Order not found.' }

  const subtotal = clean.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  // discountAmount omitted (older callers) → preserve the existing discount
  const discount = Math.min(subtotal, Math.max(0,
    input.discountAmount !== undefined ? Number(input.discountAmount) || 0 : Number(order.discount_amount ?? 0)))
  const shipping = Math.max(0, Number(input.shippingAmount) || 0)
  const total = Math.max(0, subtotal - discount) + shipping

  await svc.from('order_items').delete().eq('order_id', input.orderId)
  const { error: insErr } = await svc.from('order_items').insert(clean.map(i => ({ ...i, order_id: input.orderId })))
  if (insErr) return { ok: false, message: insErr.message }

  const { error: updErr } = await svc
    .from('orders')
    .update({ subtotal, shipping_amount: shipping, discount_amount: discount, total, updated_at: new Date().toISOString() })
    .eq('id', input.orderId)
  if (updErr) return { ok: false, message: updErr.message }

  revalidatePath(`/admin/orders/${input.orderId}`)
  return { ok: true }
}

// ── Blog ────────────────────────────────────────────────────────────────────
export async function upsertBlogPostAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()
  const id = String(formData.get('id') || '')
  const slug = String(formData.get('slug'))
  const title = String(formData.get('title'))
  const excerpt = String(formData.get('excerpt') || '')
  const body = String(formData.get('body'))
  const is_published = formData.get('is_published') === 'on'
  const published_at = is_published ? new Date().toISOString() : null

  if (id) {
    const { error } = await supabase
      .from('blog_posts')
      .update({ slug, title, excerpt, body, is_published, published_at })
      .eq('id', id)
    if (error) redirect(`/admin/blog/${id}?error=${encodeURIComponent(error.message)}`)
    revalidatePath('/blog')
    revalidatePath('/admin/blog')
    redirect(`/admin/blog/${id}?saved=1`)
  } else {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({ slug, title, excerpt, body, is_published, published_at })
      .select('id')
      .single()
    if (error) redirect(`/admin/blog/new?error=${encodeURIComponent(error.message)}`)
    revalidatePath('/blog')
    revalidatePath('/admin/blog')
    redirect(`/admin/blog/${data.id}?saved=1`)
  }
}

// ── Coupons ─────────────────────────────────────────────────────────────────
export async function createCouponAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const svc = createAdminClient()

  const code = String(formData.get('code') || '').trim().toUpperCase()
  const description = String(formData.get('description') || '').trim() || null
  const kind = String(formData.get('kind')) === 'fixed' ? 'fixed' : 'percent'
  const value = Number(formData.get('value'))
  const min_subtotal = Number(formData.get('min_subtotal') || 0)
  const maxUsesRaw = String(formData.get('max_uses') || '').trim()
  const max_uses = maxUsesRaw ? Math.max(1, Math.floor(Number(maxUsesRaw))) : null
  const expiresRaw = String(formData.get('expires_at') || '').trim()
  const expires_at = expiresRaw ? new Date(`${expiresRaw}T23:59:59`).toISOString() : null

  if (!code || !Number.isFinite(value) || value <= 0) {
    redirect(`/admin/coupons?error=${encodeURIComponent('Code and a positive value are required.')}`)
  }
  if (kind === 'percent' && value > 100) {
    redirect(`/admin/coupons?error=${encodeURIComponent('Percent discount cannot exceed 100.')}`)
  }

  const { error } = await svc.from('coupons').insert({
    code, description, kind, value,
    min_subtotal: Number.isFinite(min_subtotal) ? Math.max(0, min_subtotal) : 0,
    max_uses, expires_at,
  })

  if (error) {
    const msg = /duplicate|unique/i.test(error.message) ? `Coupon "${code}" already exists.` : error.message
    redirect(`/admin/coupons?error=${encodeURIComponent(msg)}`)
  }
  revalidatePath('/admin/coupons')
  redirect(`/admin/coupons?saved=1`)
}

export async function toggleCouponAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const svc = createAdminClient()
  const id = String(formData.get('id'))
  const active = String(formData.get('active')) === 'true'
  await svc.from('coupons').update({ is_active: active }).eq('id', id)
  revalidatePath('/admin/coupons')
}

export async function deleteCouponAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const svc = createAdminClient()
  const id = String(formData.get('id'))
  await svc.from('coupons').delete().eq('id', id)
  revalidatePath('/admin/coupons')
}

// ── Send password reset to any user ─────────────────────────────────────────
export async function sendPasswordResetAction(userId: string): Promise<AdminResult> {
  await requireAdmin()
  const svc = createAdminClient()

  const { data: authUser, error: getErr } = await svc.auth.admin.getUserById(userId)
  if (getErr || !authUser?.user?.email) {
    return { ok: false, message: getErr?.message ?? 'User not found.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { error } = await svc.auth.admin.generateLink({
    type: 'recovery',
    email: authUser.user.email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password` },
  })

  if (error) return { ok: false, message: error.message }
  return { ok: true, message: `Password reset email sent to ${authUser.user.email}.` }
}
