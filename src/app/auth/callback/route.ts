import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/safe-redirect'

/**
 * Auth callback: exchanges the `code` from email-confirmation / password-reset
 * links for a session, then redirects to `next` (defaults to /account).
 * Required by the @supabase/ssr (PKCE) flow.
 *
 * The session cookies set during exchangeCodeForSession MUST be written onto
 * the redirect response, or the browser never stores the session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next')) ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login`)
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent('Link expired or invalid. Please try again.')}`
    )
  }

  return redirectRes
}
