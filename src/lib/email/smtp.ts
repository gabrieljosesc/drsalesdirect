import 'server-only'
import nodemailer from 'nodemailer'
import type { SendEmailInput, SendEmailResult } from './resend'

const SITE_EMAIL = process.env.NOTIFICATION_EMAIL?.trim() || 'info@drsalesdirect.com'

export function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim()
  )
}

/**
 * Sends via the site's own mail server (e.g. mail.drsalesdirect.com)
 * using plain SMTP — same server that powers the info@ mailbox in webmail.
 */
export async function sendViaSmtp(input: SendEmailInput): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST!.trim()
  const port = Number(process.env.SMTP_PORT ?? 465)

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!,
    },
  })

  try {
    const info = await transporter.sendMail({
      from: `Dr Sales Direct <${SITE_EMAIL}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
    return { ok: true, id: info.messageId }
  } catch (e) {
    console.error('[email] SMTP error:', e)
    return { ok: false, error: String(e) }
  }
}
