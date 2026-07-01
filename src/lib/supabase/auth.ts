import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const getSupabase = cache(async () => createClient())

/**
 * Resolve the current user once per request.
 *
 * 1. Try getSession() (reads cookies, no refresh).
 * 2. If empty, try getUser() — safe here because the proxy already ran
 *    getUser() to refresh; this call only validates the new access token.
 *
 * Using getUser() alone in multiple Server Components races on the single-use
 * refresh token. Using only getSession() can return null even when the proxy
 * just refreshed (cookie propagation timing).
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await getSupabase()

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user

  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
})

/** Gate protected routes. Call only from layouts. */
export async function requireAuthUser(loginNext = '/account/profile'): Promise<User> {
  const user = await getAuthUser()
  if (!user) redirect(`/auth/login?redirectTo=${loginNext}`)
  return user
}

/** Account child pages — layout already enforced auth; never throw on null. */
export const getAccountUser = cache(async (): Promise<User> => {
  const user = await getAuthUser()
  if (!user) redirect('/auth/login?redirectTo=/account/profile')
  return user
})
