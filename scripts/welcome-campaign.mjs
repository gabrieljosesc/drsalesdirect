/**
 * Welcome / set-your-password campaign for migrated customers.
 *
 * - Targets migrated users who haven't been emailed yet.
 * - Order: NEWEST registrations first (by original WordPress user id, since all
 *   Supabase created_at values are the migration day).
 * - Marks each user (user_metadata.pw_reset_sent_at) after a successful send,
 *   so re-runs never double-email and the campaign resumes cleanly day to day.
 * - Paced: one email every --delay ms, up to --limit per run.
 *
 * Usage:
 *   node scripts/welcome-campaign.mjs --dry                 # preview next batch
 *   node scripts/welcome-campaign.mjs --limit=300 --delay=120000   # send 300, 2 min apart
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true })

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] })
)
const LIMIT = parseInt(args.limit ?? '300')
const DELAY = parseInt(args.delay ?? '120000') // 2 min between sends
const DRY = Boolean(args.dry)
const ORDERED_ONLY = Boolean(args['ordered-only']) // only customers with >=1 order, newest order first
const EXCLUDE = new Set(String(args.exclude || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean))
const SITE = (typeof args.site === 'string' && args.site) || 'https://www.drsalesdirect.com'
const REDIRECT = `${SITE}/auth/confirm?type=recovery&next=/auth/update-password`

const sleep = ms => new Promise(r => setTimeout(r, ms))
// Guards against a hung network call freezing the whole campaign.
const withTimeout = (p, ms, what) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${ms}ms`)), ms))])

async function fetchAllAuthUsers(sb) {
  const all = []; let page = 1
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    all.push(...(data.users ?? []))
    if (!data.nextPage) break; page++
  }
  return all
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

  const all = await fetchAllAuthUsers(admin)
  const migrated = all.filter(u => u.user_metadata?.migrated === true && u.email)

  // Most-recent order date per customer email (only used in --ordered-only mode)
  let latestOrderByEmail = new Map()
  if (ORDERED_ONLY) {
    const { data: orders } = await admin.from('orders').select('email, created_at')
    for (const o of orders ?? []) {
      const e = (o.email || '').toLowerCase().trim(); if (!e) continue
      const t = new Date(o.created_at).getTime()
      if (!latestOrderByEmail.has(e) || t > latestOrderByEmail.get(e)) latestOrderByEmail.set(e, t)
    }
  }
  const orderDate = u => latestOrderByEmail.get(u.email.toLowerCase()) ?? 0

  let candidates = migrated.filter(u => !EXCLUDE.has(u.email.toLowerCase()))
  if (ORDERED_ONLY) candidates = candidates.filter(u => latestOrderByEmail.has(u.email.toLowerCase()))

  const alreadySent = candidates.filter(u => u.user_metadata?.pw_reset_sent_at)
  const pending = candidates.filter(u => !u.user_metadata?.pw_reset_sent_at)
  pending.sort((a, b) => ORDERED_ONLY
    ? orderDate(b) - orderDate(a)                                                   // most recent order first
    : Number(b.user_metadata.wp_user_id || 0) - Number(a.user_metadata.wp_user_id || 0)) // newest registration first

  const batch = pending.slice(0, LIMIT)
  const mode = ORDERED_ONLY ? 'customers with orders, most recent order first' : 'all migrated, newest registration first'
  console.log(`Target pool: ${candidates.length} (${mode})`)
  if (EXCLUDE.size) console.log(`  excluded: ${[...EXCLUDE].join(', ')}`)
  console.log(`  already emailed: ${alreadySent.length} | still pending: ${pending.length}`)
  console.log(`This run: ${batch.length} | delay ${Math.round(DELAY / 1000)}s${DRY ? ' | DRY RUN' : ''}`)
  if (batch.length) {
    if (ORDERED_ONLY) console.log(`  top: ${batch[0].email} (order ${new Date(orderDate(batch[0])).toISOString().slice(0, 10)})`)
    console.log(`  first 3: ${batch.slice(0, 3).map(u => u.email).join(', ')}`)
  }
  if (DRY || !batch.length) { console.log('\n(no emails sent)'); return }

  const sendOnce = email =>
    withTimeout(anon.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT }), 30000, 'send')
      .then(r => r.error || null)
      .catch(e => ({ message: e.message, status: 0 }))

  let sent = 0, failed = 0
  for (const user of batch) {
    let error = await sendOnce(user.email)
    if (error && (error.status === 429 || /rate limit/i.test(error.message))) {
      console.warn(`  rate-limited on ${user.email} — waiting 60s`); await sleep(60000)
      error = await sendOnce(user.email)
    }
    if (error) { console.error(`  FAIL ${user.email}: ${error.message}`); failed++ }
    else {
      // mark sent (merge, preserving migrated/wp_user_id/full_name)
      try {
        await withTimeout(admin.auth.admin.updateUserById(user.id, {
          user_metadata: { ...user.user_metadata, pw_reset_sent_at: new Date().toISOString() },
        }), 20000, 'mark-sent')
      } catch (e) { console.warn(`  warn: ${user.email} sent but not marked: ${e.message}`) }
      sent++
      if (sent % 10 === 0) console.log(`  …sent ${sent}/${batch.length} (${new Date().toISOString().slice(11, 19)})`)
    }
    await sleep(DELAY)
  }

  const remaining = pending.length - sent
  console.log(`\nDone. sent=${sent}, failed=${failed}. Remaining after this run: ${remaining}`)
}
main().catch(e => { console.error(e); process.exit(1) })
