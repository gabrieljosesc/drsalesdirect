/**
 * Sends a fresh branded verification code to an existing (unconfirmed)
 * account — same email the site sends, useful when a signup email failed.
 *
 * Run:  node scripts/send-verify-code.mjs someone@example.com
 */
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true })

const email = (process.argv[2] ?? '').trim().toLowerCase()
if (!email) { console.error('usage: node scripts/send-verify-code.mjs <email>'); process.exit(1) }

const SITE_URL = process.argv[3] ?? 'https://drsalesdirect.vercel.app'
const BLUE = '#1f3a6b', CORAL = '#ec6a82'
const P = `style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#4b5563;margin:0 0 12px"`

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
if (error || !data.properties?.email_otp) { console.error('generateLink failed:', error?.message); process.exit(1) }

const code = data.properties.email_otp
const confirmUrl = `${SITE_URL}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent('/')}`

const html = `
<div style="font-family:Arial,sans-serif;background:#f4f6fa;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
    <div style="background:${BLUE};padding:18px 24px">
      <span style="color:#fff;font-size:19px;font-weight:700">Dr Sales <span style="color:${CORAL}">Direct</span></span>
      <span style="color:#9db4d8;font-size:10px;letter-spacing:2px;margin-left:8px">MEDICAL WHOLESALE</span>
    </div>
    <div style="padding:26px 24px;color:#1f2937">
      <h1 style="font-size:20px;margin:0 0 12px">Confirm your email address</h1>
      <p ${P}>Enter this one-time code on the verification page to activate your account:</p>
      <p style="margin:20px 0;text-align:center">
        <span style="display:inline-block;background:#f4f6fa;border:1px solid #e2e8f0;border-radius:8px;padding:14px 28px;font-family:Consolas,Menlo,monospace;font-size:28px;font-weight:bold;letter-spacing:6px;color:${BLUE}">${code}</span>
      </p>
      <p ${P}>Prefer one click? You can also confirm directly:</p>
      <p style="margin:20px 0"><a href="${confirmUrl}" style="display:inline-block;background:${CORAL};color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:6px">Verify My Email</a></p>
    </div>
    <div style="padding:14px 24px;border-top:1px solid #e2e8f0;color:#6b7280;font-size:12px">
      Dr Sales Direct · info@drsalesdirect.com · +1-855-843-4782
    </div>
  </div>
</div>`

const port = Number(process.env.SMTP_PORT ?? 465)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST.trim(), port, secure: port === 465,
  auth: { user: process.env.SMTP_USER.trim(), pass: process.env.SMTP_PASS },
})
await transporter.sendMail({
  from: process.env.EMAIL_FROM || 'Dr Sales Direct <info@drsalesdirect.com>',
  to: email,
  subject: 'Your verification code — Dr Sales Direct',
  html,
  text: `Your Dr Sales Direct verification code is: ${code}\n\nOr confirm with one click: ${confirmUrl}`,
})
console.log(`Sent verification code to ${email}`)
