'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export type ReviewState = null | { error: string } | { ok: string }

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in to leave a review.' }

  const product_id = String(formData.get('product_id') || '')
  const slug = String(formData.get('slug') || '')
  const rating = Number(formData.get('rating'))
  const title = String(formData.get('title') || '').trim().slice(0, 120)
  const body = String(formData.get('body') || '').trim().slice(0, 2000)

  if (!product_id || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Select a rating from 1 to 5 stars.' }
  }
  if (!body) return { error: 'Please write a few words about the product.' }

  const svc = createAdminClient()

  // "Verified purchase" — the reviewer has an order containing this product
  const { data: purchase } = await svc
    .from('order_items')
    .select('id, order:orders!inner(user_id)')
    .eq('product_id', product_id)
    .eq('order.user_id', user.id)
    .limit(1)
  const is_verified = Boolean(purchase?.length)

  const { error } = await svc.from('product_reviews').upsert(
    {
      product_id,
      user_id: user.id,
      rating,
      title: title || null,
      body,
      is_verified,
    },
    { onConflict: 'product_id,user_id' }
  )

  if (error) {
    console.error('[submitReview]', error.message)
    return { error: 'Could not save your review. Please try again.' }
  }

  if (slug) revalidatePath(`/product/${slug}`)
  return { ok: 'Thank you! Your review has been published.' }
}
