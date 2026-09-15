/**
 * Emails migrated customers a branded "set your password" message so they can
 * sign in to the new site (their old passwords were not carried across).
 *
 * Mirrors acemedicalwholesale's campaign: an admin recovery link
 * (auth/confirm?token_hash=…) wrapped in the Dr Sales Direct email shell,
 * sent through the site's own SMTP server (or Resend) — NOT Supabase's
 * rate-limited built-in mailer.
 *
 * Successful sends are marked in user_metadata.pw_reset_sent_at, so re-runs
 * resume where the campaign stopped and never double-email anyone.
 *
 *   node scripts/send-password-resets.mjs                    → list targets only
 *   node scripts/send-password-resets.mjs --only=a@b.com     → send ONE test email
 *   node scripts/send-password-resets.mjs --send             → send to all pending
 *   node scripts/send-password-resets.mjs --send --limit=200 → batch send
 *
 * Other flags: --delay=ms (default 1200)  --site=https://…
 *              --ordered-only (only migrated users with at least one order)
 *
 * Requires SMTP_HOST/SMTP_USER/SMTP_PASS (or RESEND_API_KEY) in .env.local.
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true })

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.slice(2).split('=')
    return [k, v ?? true]
  })
)

const SEND = args.send === true
const ONLY = (typeof args.only === 'string' ? args.only : '').toLowerCase().trim()
const LIMIT = parseInt(args.limit ?? '9999', 10)
const DELAY = parseInt(args.delay ?? '1200', 10)
const ORDERED_ONLY = args['ordered-only'] === true

const envSite = process.env.NEXT_PUBLIC_SITE_URL
const SITE_URL =
  (typeof args.site === 'string' && args.site) ||
  (envSite && !envSite.includes('localhost') ? envSite : null) ||
  'https://drsalesdirect.com'

const BLUE = '#1f3a6b'
const CORAL = '#ec6a82'
const P = `style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#4b5563;margin:0 0 12px"`

// Same shell as src/lib/email/auth-emails.ts, with migration-specific copy.
function resetEmailHtml(resetUrl) {
  return `
  <div style="font-family:Arial,sans-serif;background:#f4f6fa;padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background:${BLUE};padding:18px 24px">
        <span style="color:#ffffff;font-size:19px;font-weight:700">Dr Sales <span style="color:${CORAL}">Direct</span></span>
        <span style="color:#9db4d8;font-size:10px;letter-spacing:2px;margin-left:8px">MEDICAL WHOLESALE</span>
      </div>
      <div style="padding:26px 24px;color:#1f2937">
        <h1 style="font-size:20px;margin:0 0 12px">Your account is ready — set your password</h1>
        <p ${P}>Welcome to the new Dr Sales Direct. Your account has already been
        moved over for you.</p>
        <p ${P}>For security, your old password was not carried across. Click the button
        below to set a new one and sign in.</p>
        <p ${P}>As a thank-you for coming back: a one-time <strong>10% discount</strong> is
        applied automatically at checkout on your first order through the new site.</p>
        <p style="margin:20px 0">
          <a href="${resetUrl}" style="display:inline-block;background:${CORAL};color:#ffffff;text-decoration:none;font-weight:bold;font-family:Arial,sans-serif;font-size:14px;padding:12px 28px;border-radius:6px">Set My Password</a>
        </p>
        <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;word-break:break-all">
          Or copy this link into your browser:<br>${resetUrl}
        </p>
        <p style="font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;margin:24px 0 0">
          If you did not expect this email, you can safely ignore it.
        </p>
      </div>
      <div style="padding:14px 24px;border-top:1px solid #e2e8f0;color:#6b7280;font-size:12px;font-family:Arial,sans-serif">
        Dr Sales Direct · info@drsalesdirect.com · +1-855-843-4782
      </div>
    </div>
  </div>`
}

function resetEmailText(resetUrl) {
  return `Welcome to the new Dr Sales Direct.

Your account has been moved over. For security, your old password was not carried across — set a new one here:

${resetUrl}

As a thank-you for coming back, a one-time 10% discount is applied automatically at checkout on your first order through the new site.

If you did not expect this email, you can safely ignore it.`
}

const SUBJECT = 'Set your password — your Dr Sales Direct account is ready'

async function makeSender() {
  if (process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()) {
    const { default: nodemailer } = await import('nodemailer')
    const port = Number(process.env.SMTP_PORT ?? 465)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER.trim(), pass: process.env.SMTP_PASS },
    })
    const from = process.env.EMAIL_FROM || 'Dr Sales Direct <info@drsalesdirect.com>'
    console.log(`Transport: SMTP (${process.env.SMTP_HOST.trim()}:${port})`)
    return async (to, resetUrl) => {
      await transporter.sendMail({ from, to, subject: SUBJECT, html: resetEmailHtml(resetUrl), text: resetEmailText(resetUrl) })
    }
  }
  if (process.env.RESEND_API_KEY?.trim()) {
    const from = process.env.EMAIL_FROM || 'Dr Sales Direct <info@drsalesdirect.com>'
    console.log('Transport: Resend API')
    return async (to, resetUrl) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject: SUBJECT, html: resetEmailHtml(resetUrl), text: resetEmailText(resetUrl) }),
      })
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
    }
  }
  return null
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchAllAuthUsers(client) {
  const all = []
  let page = 1
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    all.push(...(data.users ?? []))
    if (!data.nextPage) break
    page++
  }
  return all
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('Missing Supabase env vars in .env.local'); process.exit(1) }
  const admin = createClient(url, key, { auth: { persistSession: false } })

  console.log('Loading users…')
  const users = await fetchAllAuthUsers(admin)

  let customerEmails = new Set()
  if (ORDERED_ONLY) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from('orders').select('email').range(from, from + 999)
      if (error) throw error
      for (const o of data ?? []) if (o.email) customerEmails.add(o.email.toLowerCase())
      if (!data || data.length < 1000) break
    }
  }

  const migrated = users.filter(u => u.email && u.user_metadata?.migrated === true)
  const alreadySent = migrated.filter(u => u.user_metadata?.pw_reset_sent_at)
  let targets = ONLY
    ? users.filter(u => u.email?.toLowerCase() === ONLY)
    : migrated
        .filter(u => !u.user_metadata?.pw_reset_sent_at)
        .filter(u => !ORDERED_ONLY || customerEmails.has(u.email.toLowerCase()))
        .sort((a, b) => a.email.localeCompare(b.email))
        .slice(0, LIMIT)

  console.log(`Users: total=${users.length} migrated=${migrated.length} already-emailed=${alreadySent.length}`)
  console.log(`Targets (limit=${LIMIT}${ONLY ? `, only=${ONLY}` : ''}${ORDERED_ONLY ? ', ordered-only' : ''}): ${targets.length}`)
  console.log(`Reset links point to: ${SITE_URL}\n`)

  if (ONLY && targets.length === 0) { console.error(`No account found for --only=${ONLY}.`); process.exit(1) }

  if (!SEND && !ONLY) {
    for (const u of targets.slice(0, 30)) console.log(`  would email: ${u.email}`)
    if (targets.length > 30) console.log(`  … and ${targets.length - 30} more`)
    console.log('\nListing only. Re-run with --send (or --only=email@x.com for one test) to actually email.')
    return
  }

  const send = await makeSender()
  if (!send) {
    console.error('No email transport configured. Add SMTP_HOST / SMTP_USER / SMTP_PASS (or RESEND_API_KEY) to .env.local.')
    process.exit(1)
  }

  let sent = 0, failed = 0
  for (const user of targets) {
    try {
      const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: user.email })
      if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? 'no token')
      const resetUrl =
        `${SITE_URL}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
        `&type=recovery&next=${encodeURIComponent('/auth/update-password')}`
      await send(user.email, resetUrl)
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, pw_reset_sent_at: new Date().toISOString() },
      }).catch(e => console.warn(`  warn: ${user.email} sent but not marked: ${e.message}`))
      console.log(`  SENT: ${user.email}`)
      sent++
    } catch (e) {
      console.error(`  FAIL: ${user.email} — ${e.message}`)
      failed++
    }
    await sleep(DELAY)
  }

  console.log(`\nDone. sent=${sent} failed=${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
