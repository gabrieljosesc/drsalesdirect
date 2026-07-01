import 'server-only'

const SITE_EMAIL = process.env.NOTIFICATION_EMAIL?.trim() || 'info@drsalesdirect.com'

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export type SendEmailResult = { ok: true; id?: string } | { ok: false; error: string }

/**
 * Sends a transactional email via Resend.
 * Requires RESEND_API_KEY and a verified sending domain for the from-address.
 * If the key is missing it logs and no-ops (so checkout never breaks).
 */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey || apiKey === 'your_resend_api_key') {
    console.warn('[email] RESEND_API_KEY not set; skipped:', input.subject)
    return { ok: false, error: 'Email not configured (missing RESEND_API_KEY).' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Dr Sales Direct <${SITE_EMAIL}>`,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[email] Resend error:', res.status, body)
      return { ok: false, error: body || `Resend HTTP ${res.status}` }
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, id: data.id }
  } catch (e) {
    console.error('[email] send failed:', e)
    return { ok: false, error: String(e) }
  }
}
