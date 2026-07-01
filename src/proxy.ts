import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Next 16: proxy replaces middleware; runs on the Node runtime so the
// Supabase session refresh works reliably in production.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
