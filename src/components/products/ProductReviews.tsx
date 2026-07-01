import { Star, BadgeCheck } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/auth'
import { ReviewForm } from './ReviewForm'

type ReviewRow = {
  id: string
  user_id: string
  rating: number
  title: string | null
  body: string | null
  is_verified: boolean
  created_at: string
}

function Stars({ value, className = 'w-4 h-4' }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`${className} ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </span>
  )
}

/** Mask a name for public display: "Jane Smith" → "Jane S." */
function displayName(fullName: string | null | undefined, email: string | null | undefined): string {
  const name = (fullName ?? '').trim()
  if (name) {
    const parts = name.split(/\s+/)
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
  }
  const local = (email ?? '').split('@')[0]
  return local ? `${local.slice(0, 2)}***` : 'Verified Customer'
}

export async function ProductReviews({ productId, slug }: { productId: string; slug: string }) {
  const svc = createAdminClient()
  const user = await getAuthUser()

  const [{ data: reviewRows }, { data: product }] = await Promise.all([
    svc
      .from('product_reviews')
      .select('id, user_id, rating, title, body, is_verified, created_at')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(20),
    svc.from('products').select('rating, review_count').eq('id', productId).single(),
  ])

  const reviews = (reviewRows ?? []) as ReviewRow[]

  // Reviewer display names
  const userIds = [...new Set(reviews.map(r => r.user_id))]
  const names = new Map<string, string>()
  if (userIds.length) {
    const { data: profiles } = await svc
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
    for (const p of profiles ?? []) {
      names.set(p.id, displayName(p.full_name, p.email))
    }
  }

  const existing = user ? reviews.find(r => r.user_id === user.id) ?? null : null
  const avg = Number(product?.rating ?? 0)
  const count = Number(product?.review_count ?? 0)

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-800">Customer Reviews</h2>
        {count > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Stars value={avg} />
            <span className="font-semibold text-gray-800">{avg.toFixed(1)}</span>
            <span>({count} review{count === 1 ? '' : 's'})</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        {/* List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-400">
              No reviews yet. Be the first to share your experience.
            </div>
          ) : (
            reviews.map(r => (
              <article key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} className="w-3.5 h-3.5" />
                    {r.title && <span className="font-semibold text-sm text-gray-900">{r.title}</span>}
                  </div>
                  <time className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </time>
                </div>
                {r.body && <p className="mt-2 text-sm text-gray-700 leading-relaxed">{r.body}</p>}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{names.get(r.user_id) ?? 'Verified Customer'}</span>
                  {r.is_verified && (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified purchase
                    </span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        {/* Form */}
        <ReviewForm
          productId={productId}
          slug={slug}
          isLoggedIn={Boolean(user)}
          existing={existing ? { rating: existing.rating, title: existing.title, body: existing.body } : null}
        />
      </div>
    </section>
  )
}
