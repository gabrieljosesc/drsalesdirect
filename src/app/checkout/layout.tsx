import { requireAuthUser } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

/** Checkout requires a signed-in account (saved card + profile prefill). */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  await requireAuthUser('/checkout')
  return <>{children}</>
}
