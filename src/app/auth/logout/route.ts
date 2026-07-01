import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Sign-out must NOT happen on GET: Next.js prefetches <Link> hrefs, so a GET
 * logout route gets silently executed whenever a logout link is on screen —
 * destroying the session right after login. GET now just redirects home.
 */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/', request.url))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}
