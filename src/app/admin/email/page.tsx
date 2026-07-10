import { SendTestEmailButton } from './send-test-button'

export const metadata = { title: 'Email Diagnostics' }
export const dynamic = 'force-dynamic'

/** Email diagnostics — confirm order/auth notifications can actually send. */
export default function AdminEmailPage() {
  const smtpHost = process.env.SMTP_HOST?.trim() || null
  const smtpUser = process.env.SMTP_USER?.trim() || null
  const smtpPassSet = Boolean(process.env.SMTP_PASS?.trim())
  const smtpPort = process.env.SMTP_PORT?.trim() || '465'
  const smtpReady = Boolean(smtpHost && smtpUser && smtpPassSet)
  const resendSet = Boolean(process.env.RESEND_API_KEY?.trim())
  const notifyEmail = process.env.NOTIFICATION_EMAIL?.trim() || 'info@drsalesdirect.com (default)'
  const extraEmails = (process.env.ADMIN_NOTIFY_EMAILS ?? '')
    .split(',').map(e => e.trim()).filter(Boolean)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || '(unset)'

  const transport = smtpReady ? 'Own mail server (SMTP)' : resendSet ? 'Resend (fallback)' : 'NONE — emails are silently skipped'

  const Row = ({ label, value, bad }: { label: string; value: string; bad?: boolean }) => (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-gray-600">{label}</dt>
      <dd className={`text-right font-medium ${bad ? 'text-red-600' : 'text-gray-900'}`}>{value}</dd>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900">Email diagnostics</h1>
      <p className="mt-2 text-sm text-gray-600">
        Order confirmations, admin alerts, and the welcome campaign send through the transport
        below. Use this page to confirm sending works after a hosting, DNS, or mailbox change.
      </p>

      <dl className="mt-6 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white text-sm">
        <Row label="Active transport" value={transport} bad={!smtpReady && !resendSet} />
        <Row label="SMTP host" value={smtpHost ? `${smtpHost}:${smtpPort}` : 'not set'} bad={!smtpHost} />
        <Row label="SMTP user" value={smtpUser ?? 'not set'} bad={!smtpUser} />
        <Row label="SMTP password" value={smtpPassSet ? 'set' : 'not set'} bad={!smtpPassSet} />
        <Row label="Resend fallback" value={resendSet ? 'configured' : 'not configured'} />
        <Row label="Sends from / notifications to" value={notifyEmail} />
        {extraEmails.length > 0 && <Row label="Extra admin recipients" value={extraEmails.join(', ')} />}
        <Row label="Site URL in email links" value={siteUrl} bad={siteUrl.includes('localhost')} />
      </dl>

      <div className="mt-6">
        <SendTestEmailButton />
      </div>

      <div className="mt-8 rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs leading-relaxed text-gray-600">
        <p className="font-medium text-gray-700">If the test fails:</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li><strong>Authentication failed (535)</strong> — the SMTP_PASS in the environment is wrong. Use the real mailbox password from the hosting panel.</li>
          <li><strong>Certificate mismatch</strong> — use the mail server hostname that matches its TLS certificate (e.g. <code className="rounded bg-gray-200 px-1">mail.02.keystone-studio.com</code>), not the vanity domain.</li>
          <li><strong>Nothing configured</strong> — set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / NOTIFICATION_EMAIL in Vercel and redeploy.</li>
          <li>Separately, Supabase Auth (signup verification &amp; password resets) has its own SMTP config: Supabase dashboard → Authentication → Emails → SMTP Settings.</li>
        </ul>
      </div>
    </div>
  )
}
