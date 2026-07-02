'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { submitReview, type ReviewState } from '@/app/actions/reviews'

export function ReviewForm({
  productId,
  slug,
  isLoggedIn,
  existing,
}: {
  productId: string
  slug: string
  isLoggedIn: boolean
  existing?: { rating: number; title: string | null; body: string | null } | null
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, null)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hovered, setHovered] = useState(0)

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        <Link href={`/auth/login?redirectTo=/product/${slug}`} className="font-medium text-[#ec6a82] hover:underline">
          Sign in
        </Link>{' '}
        to leave a review.
      </div>
    )
  }

  return (
    <form action={action} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-900">
        {existing ? 'Update your review' : 'Write a review'}
      </h3>

      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />

      {/* Star picker */}
      <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="p-0.5"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                n <= (hovered || rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {rating > 0 && <span className="ml-2 text-sm text-gray-500">{rating} / 5</span>}
      </div>

      <input
        name="title"
        defaultValue={existing?.title ?? ''}
        placeholder="Review title (optional)"
        maxLength={120}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]"
      />

      <textarea
        name="body"
        defaultValue={existing?.body ?? ''}
        placeholder="Share your experience with this product…"
        rows={4}
        maxLength={2000}
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82] resize-none"
      />

      {state && 'error' in state && <p className="text-sm text-red-600">{state.error}</p>}
      {state && 'ok' in state && <p className="text-sm text-green-700">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="rounded-md bg-[#ec6a82] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#d95672] disabled:opacity-50"
      >
        {pending ? 'Submitting…' : existing ? 'Update Review' : 'Submit Review'}
      </button>
    </form>
  )
}
