import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { smtpConfigured } from '@/lib/email/smtp'

export const dynamic = 'force-dynamic'

/**
 * Admin-only diagnostic: shows which email transport this deployment has
 * configured (no secrets). Open /api/email-health on the live site after
 * setting the SMTP_* env vars to confirm order emails can actually send.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const smtp = smtpConfigured()
  const resend = Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_API_KEY.trim() !== 'your_resend_api_key')

  return NextResponse.json({
    canSendEmail: smtp || resend,
    transport: smtp ? 'smtp (own mail server)' : resend ? 'resend (fallback)' : 'NONE — order emails are silently skipped',
    smtpConfigured: smtp,
    smtpHost: process.env.SMTP_HOST?.trim() || null,
    resendConfigured: resend,
    notificationEmail: process.env.NOTIFICATION_EMAIL?.trim() || 'info@drsalesdirect.com (default)',
    adminNotifyEmails: process.env.ADMIN_NOTIFY_EMAILS?.trim() || null,
  })
}
