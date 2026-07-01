import { NextResponse, type NextRequest } from 'next/server'
import { createClient, type User } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Welcome / set-password campaign, driven by Vercel Cron (see vercel.json).
 *
 * Each tick sends a small batch of reset emails and exits — server-side, so it
 * is immune to a local machine sleeping or a hung process. The pace comes from
 * the cron frequency × CAMPAIGN_BATCH_SIZE, not from internal sleeps.
 *
 * Targeting (mirrors scripts/welcome-campaign.mjs):
 *  - migrated customers only, never double-emailed (user_metadata.pw_reset_sent_at),
 *  - mode 'ordered' (default): only customers with >=1 order, most recent order first,
 *  - excludes CAMPAIGN_EXCLUDE emails (the test account).
 *
 * Env: CRON_SECRET (required), CAMPAIGN_BATCH_SIZE (default 3),
 *      CAMPAIGN_MODE ('ordered'|'all', default 'ordered'),
 *      CAMPAIGN_EXCLUDE (comma list, default the test account).
 */
const SITE = 'https://www.drsalesdirect.com'
const REDIRECT = `${SITE}/auth/confirm?type=recovery&next=/auth/update-password`

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Supabase rate-limits reset requests to ~1 per 60s, so each tick sends ONE
  // email — the pacing comes from the cron schedule, never a burst.
  const BATCH = Math.max(1, parseInt(process.env.CAMPAIGN_BATCH_SIZE ?? '1'))
  const MODE = process.env.CAMPAIGN_MODE ?? 'ordered'
  const EXCLUDE = new Set(
    String(process.env.CAMPAIGN_EXCLUDE ?? 'gabbymayuga77@gmail.com')
      .toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
  )

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })

  // All migrated auth users
  const all: User[] = []
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    all.push(...data.users)
    if (!data.nextPage) break
    page++
  }
  const migrated = all.filter(u => u.user_metadata?.migrated === true && u.email)

  // Most-recent order date per customer email (ordered mode)
  const latest = new Map<string, number>()
  if (MODE === 'ordered') {
    const { data: orders } = await admin.from('orders').select('email, created_at')
    for (const o of orders ?? []) {
      const e = String(o.email ?? '').toLowerCase().trim(); if (!e) continue
      const t = new Date(o.created_at).getTime()
      if (!latest.has(e) || t > latest.get(e)!) latest.set(e, t)
    }
  }
  const odate = (u: { email?: string }) => latest.get((u.email ?? '').toLowerCase()) ?? 0

  let cands = migrated.filter(u => !EXCLUDE.has(u.email!.toLowerCase()))
  if (MODE === 'ordered') cands = cands.filter(u => latest.has(u.email!.toLowerCase()))

  // Skip addresses that have failed repeatedly (e.g. dead emails) so a single
  // bad address at the front of the queue can't block the whole campaign.
  const pending = cands
    .filter(u => !u.user_metadata?.pw_reset_sent_at && Number(u.user_metadata?.pw_reset_attempts || 0) < 3)
    .sort((a, b) => MODE === 'ordered'
      ? odate(b) - odate(a)
      : Number(b.user_metadata?.wp_user_id || 0) - Number(a.user_metadata?.wp_user_id || 0))

  const batch = pending.slice(0, BATCH)
  let sent = 0, failed = 0
  for (const u of batch) {
    const { error } = await anon.auth.resetPasswordForEmail(u.email!, { redirectTo: REDIRECT })
    if (error) {
      // record the attempt so a persistently-failing address gets set aside
      await admin.auth.admin.updateUserById(u.id, {
        user_metadata: { ...u.user_metadata, pw_reset_attempts: Number(u.user_metadata?.pw_reset_attempts || 0) + 1 },
      })
      failed++
      continue
    }
    await admin.auth.admin.updateUserById(u.id, {
      user_metadata: { ...u.user_metadata, pw_reset_sent_at: new Date().toISOString() },
    })
    sent++
  }

  return NextResponse.json({
    ok: true, mode: MODE, sent, failed, remaining: pending.length - sent,
  })
}
