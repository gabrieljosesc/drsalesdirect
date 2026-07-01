'use server'

import { createAdminClient } from '@/lib/supabase/server'

export type CouponRow = {
  id: string
  code: string
  description: string | null
  kind: 'percent' | 'fixed'
  value: number
  min_subtotal: number
  max_uses: number | null
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export type CouponValidation =
  | { ok: true; code: string; discount: number; description: string | null }
  | { ok: false; error: string }

/**
 * Validates a coupon against a subtotal and returns the discount amount.
 * Runs with the service role — customers can never read the coupons table.
 */
export async function validateCoupon(rawCode: string, subtotal: number): Promise<CouponValidation> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { ok: false, error: 'Enter a coupon code.' }
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return { ok: false, error: 'Your cart is empty.' }
  }

  const svc = createAdminClient()
  const { data: coupon } = await svc
    .from('coupons')
    .select('*')
    .ilike('code', code)
    .maybeSingle()

  if (!coupon) return { ok: false, error: 'Invalid coupon code.' }

  const c = coupon as CouponRow
  if (!c.is_active) return { ok: false, error: 'This coupon is no longer active.' }
  if (c.expires_at && new Date(c.expires_at) < new Date()) {
    return { ok: false, error: 'This coupon has expired.' }
  }
  if (c.max_uses !== null && c.used_count >= c.max_uses) {
    return { ok: false, error: 'This coupon has reached its usage limit.' }
  }
  if (subtotal < Number(c.min_subtotal)) {
    return { ok: false, error: `This coupon requires a minimum order of $${Number(c.min_subtotal).toFixed(2)}.` }
  }

  const discount = c.kind === 'percent'
    ? Math.round(subtotal * Number(c.value)) / 100
    : Math.min(Number(c.value), subtotal)

  return { ok: true, code: c.code.toUpperCase(), discount, description: c.description }
}

/** Increments the coupon usage counter after an order is placed. Never throws. */
export async function recordCouponUse(code: string): Promise<void> {
  try {
    const svc = createAdminClient()
    await svc.rpc('increment_coupon_use', { p_code: code })
  } catch (e) {
    console.error('[recordCouponUse]', e)
  }
}
