'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuthUser } from '@/lib/supabase/auth'
import { sendTransactionalEmail } from '@/lib/email/send'

export type TestEmailState = { ok: boolean; message: string } | null

/** Admin-only: send a test email through the configured transport. */
export async function sendTestEmailAction(): Promise<TestEmailState> {
  const user = await requireAuthUser('/admin/email')
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { ok: false, message: 'Not authorized.' }

  const to = user.email || process.env.NOTIFICATION_EMAIL?.trim()
  if (!to) return { ok: false, message: 'No recipient (admin has no email and NOTIFICATION_EMAIL is unset).' }

  const result = await sendTransactionalEmail({
    to,
    subject: 'Dr Sales Direct — test email',
    html: `<p>This is a test email from the Dr Sales Direct admin panel.</p>
<p>If you are reading this, transactional email is working. Sent ${new Date().toISOString()}.</p>`,
    text: 'This is a test email from the Dr Sales Direct admin panel. If you are reading this, transactional email is working.',
  })

  return result.ok
    ? { ok: true, message: `Test email sent to ${to} — check the inbox (and spam folder).` }
    : { ok: false, message: `Send failed: ${result.error ?? 'unknown error'}` }
}
