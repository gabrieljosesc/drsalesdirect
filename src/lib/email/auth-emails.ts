import 'server-only'
import { sendTransactionalEmail, type SendEmailResult } from './send'

/**
 * Branded auth emails (verification code, password reset), sent through the
 * site's own transport (SMTP first, Resend fallback) — the same architecture
 * as acemedicalwholesale: Supabase's rate-limited built-in mailer is never
 * used. Table-free inline-styled HTML for broad client support.
 */

const BLUE = '#1f3a6b'
const CORAL = '#ec6a82'
const INK = '#1f2937'
const P = `style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#4b5563;margin:0 0 12px"`

export function authEmailShell(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:Arial,sans-serif;background:#f4f6fa;padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background:${BLUE};padding:18px 24px">
        <span style="color:#ffffff;font-size:19px;font-weight:700">Dr Sales <span style="color:${CORAL}">Direct</span></span>
        <span style="color:#9db4d8;font-size:10px;letter-spacing:2px;margin-left:8px">MEDICAL WHOLESALE</span>
      </div>
      <div style="padding:26px 24px;color:${INK}">
        <h1 style="font-family:Arial,sans-serif;font-size:20px;margin:0 0 12px;color:${INK}">${title}</h1>
        ${bodyHtml}
        <p style="font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;margin:24px 0 0">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
      <div style="padding:14px 24px;border-top:1px solid #e2e8f0;color:#6b7280;font-size:12px;font-family:Arial,sans-serif">
        Dr Sales Direct · info@drsalesdirect.com · +1-855-843-4782
      </div>
    </div>
  </div>`
}

export function authEmailButton(href: string, label: string): string {
  return `
    <p style="margin:20px 0">
      <a href="${href}" style="display:inline-block;background:${CORAL};color:#ffffff;text-decoration:none;font-weight:bold;font-family:Arial,sans-serif;font-size:14px;padding:12px 28px;border-radius:6px">${label}</a>
    </p>
    <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;word-break:break-all">
      Or copy this link into your browser:<br>${href}
    </p>`
}

/** Registration verification: shows the one-time code big, with a link fallback. */
export async function sendVerifyCodeEmail(
  to: string,
  code: string,
  confirmUrl: string,
): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: 'Your verification code — Dr Sales Direct',
    html: authEmailShell(
      'Confirm your email address',
      `<p ${P}>Welcome to Dr Sales Direct! Enter this one-time code on the verification
       page to activate your account:</p>
       <p style="margin:20px 0;text-align:center">
         <span style="display:inline-block;background:#f4f6fa;border:1px solid #e2e8f0;border-radius:8px;padding:14px 28px;font-family:Consolas,Menlo,monospace;font-size:28px;font-weight:bold;letter-spacing:6px;color:${BLUE}">${code}</span>
       </p>
       <p ${P}>Prefer one click? You can also confirm directly:</p>
       ${authEmailButton(confirmUrl, 'Verify My Email')}`
    ),
    text: `Welcome to Dr Sales Direct!\n\nYour verification code is: ${code}\n\nEnter it on the verification page to activate your account, or open this link:\n${confirmUrl}\n\nIf you did not create an account, ignore this email.`,
  })
}

/** Password-reset email for the site's forgot-password flow. */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: 'Reset your password — Dr Sales Direct',
    html: authEmailShell(
      'Reset your password',
      `<p ${P}>We received a request to reset the password for your account. Click the
       button below to choose a new password.</p>
       ${authEmailButton(resetUrl, 'Reset My Password')}`
    ),
    text: `Reset your Dr Sales Direct password:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
  })
}
