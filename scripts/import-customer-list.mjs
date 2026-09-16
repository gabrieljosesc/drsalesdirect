/**
 * Creates accounts for the client's customer list (name,email CSV) —
 * used instead of the full WordPress migration per the client's decision
 * to skip order-history import.
 *
 * Each row becomes a confirmed Supabase user with user_metadata.migrated=true
 * (so the password campaign targets them and checkout treats them as
 * returning customers for COMEBACK10) plus a customer profile row.
 * Existing emails are skipped, so re-runs are safe.
 *
 * Run:  node scripts/import-customer-list.mjs <list.csv> [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), quiet: true })

const DRY = process.argv.includes('--dry-run')
const csvPath = process.argv[2]
if (!csvPath || !fs.existsSync(csvPath)) {
  console.error('usage: node scripts/import-customer-list.mjs <list.csv> [--dry-run]')
  process.exit(1)
}

const rows = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/)
  .map(l => l.trim()).filter(Boolean)
  .map(l => {
    const i = l.lastIndexOf(',')
    return { name: l.slice(0, i).trim(), email: l.slice(i + 1).trim().toLowerCase() }
  })
  .filter(r => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email))

// De-dupe by email (first occurrence wins)
const seen = new Set()
const list = rows.filter(r => !seen.has(r.email) && seen.add(r.email))
console.log(`CSV rows: ${rows.length} | unique valid emails: ${list.length}`)

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Existing accounts
const existing = new Map()
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) throw error
  for (const u of data.users ?? []) if (u.email) existing.set(u.email.toLowerCase(), u.id)
  if (!data.nextPage) break
}

const toCreate = list.filter(r => !existing.has(r.email))
console.log(`already have accounts: ${list.length - toCreate.length} | to create: ${toCreate.length}`)
if (DRY) { toCreate.forEach(r => console.log(`  + ${r.email}  (${r.name})`)); process.exit(0) }

let created = 0, failed = 0
for (const r of toCreate) {
  try {
    const { data, error } = await admin.auth.admin.createUser({
      email: r.email,
      email_confirm: true, // trusted existing customers; they set a password via the campaign link
      password: crypto.randomBytes(24).toString('base64url'), // unguessable placeholder until they set their own
      user_metadata: { full_name: r.name, migrated: true },
    })
    if (error) throw new Error(error.message)
    await admin.from('profiles').upsert({
      id: data.user.id, email: r.email, full_name: r.name, role: 'customer',
    }, { onConflict: 'id' })
    created++
  } catch (e) {
    console.error(`  FAIL ${r.email}: ${e.message}`)
    failed++
  }
}
console.log(`\nDone. created=${created} failed=${failed} skipped-existing=${list.length - toCreate.length}`)
