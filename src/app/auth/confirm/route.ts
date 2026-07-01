import { type EmailOtpType } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/safe-redirect'

/**
 * Verifies an email OTP link (password recovery, signup, email change) via
 * `token_hash`, writes the session cookies, then redirects to `next`.
 *
 * Used by the Supabase email templates, e.g.:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password
 *
 * Unlike the implicit (#access_token hash) flow, token_hash is a query param,
 * so it works server-side and survives the apex→www 308 redirect. The session
 * cookies set during verifyOtp MUST be written onto the redirect response.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNext(searchParams.get('next')) ?? '/account'

  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(msg)}`)

  if (!token_hash || !type) return fail('That link is invalid. Please request a new one.')

  const redirectRes = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectRes.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })
  if (error) return fail('That link has expired or is invalid. Please request a new one.')

  return redirectRes
}
