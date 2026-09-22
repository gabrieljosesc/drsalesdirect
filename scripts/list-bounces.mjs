/**
 * Reads recent bounce messages (MAILER-DAEMON) from the info@ inbox over IMAP
 * and lists which recipients failed, grouped by reason.
 *
 * Run:  node scripts/list-bounces.mjs [--days=3]
 */
import { ImapFlow } from 'imapflow'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true })

const days = parseInt((process.argv.find(a => a.startsWith('--days=')) ?? '--days=3').split('=')[1], 10)
const since = new Date(Date.now() - days * 86400_000)

const client = new ImapFlow({
  host: process.env.SMTP_HOST.trim(),
  port: 993,
  secure: true,
  auth: { user: process.env.SMTP_USER.trim(), pass: process.env.SMTP_PASS },
  logger: false,
})

await client.connect()
const lock = await client.getMailboxLock('INBOX')
const failures = new Map() // email -> reason snippet
try {
  const uids = await client.search({ since, from: 'MAILER-DAEMON' })
  console.log(`Bounce messages since ${since.toISOString().slice(0, 10)}: ${uids.length}`)
  for (const uid of uids) {
    const { content } = await client.download(String(uid))
    let text = ''
    for await (const chunk of content) { text += chunk.toString('utf8'); if (text.length > 40000) break }
    // Failed recipient: prefer the machine-readable DSN field, fall back to "<x@y>: host ..." lines
    const final = [...text.matchAll(/Final-Recipient:\s*rfc822;\s*([^\s;<>]+@[^\s;<>]+)/gi)].map(m => m[1])
    const angled = [...text.matchAll(/<([^<>\s]+@[^<>\s]+)>:\s*host /gi)].map(m => m[1])
    const rcpts = [...new Set([...final, ...angled])].filter(e => !/drsalesdirect\.com$/i.test(e))
    const status = text.match(/\b(5\d\d[- ]?\d\.\d\.\d|4\d\d[- ]?\d\.\d\.\d)\b/)?.[1] ?? '?'
    const blocked = /block list|blocked|blacklist|spamhaus|S3150/i.test(text)
    for (const r of rcpts) failures.set(r.toLowerCase(), `${status}${blocked ? ' (IP block list)' : ''}`)
  }
} finally {
  lock.release()
  await client.logout()
}

console.log(`\nUnique failed recipients: ${failures.size}`)
const byReason = {}
for (const [email, reason] of failures) (byReason[reason] = byReason[reason] || []).push(email)
for (const [reason, emails] of Object.entries(byReason)) {
  console.log(`\n[${reason}] ${emails.length}:`)
  emails.sort().forEach(e => console.log('  ' + e))
}
