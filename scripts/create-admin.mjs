/**
 * Create (or promote) an admin user in Supabase.
 *
 * Usage:
 *   node scripts/create-admin.mjs <email> <password>
 *   node scripts/create-admin.mjs admin@drsalesdirect.com "admin@123"
 *
 * If no args given, defaults to the credentials below.
 *
 * - If the user does not exist: creates the auth account (email pre-confirmed).
 * - If the user already exists: updates the password.
 * - Either way: upserts the profile with role = 'admin'.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const EMAIL = process.argv[2] || 'admin@drsalesdirect.com'
const PASSWORD = process.argv[3] || 'admin@123'

async function findUserByEmail(supabase, email) {
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const found = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (!data.nextPage) return null
    page++
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  console.log(`Setting up admin: ${EMAIL}`)

  let userId
  const existing = await findUserByEmail(supabase, EMAIL)

  if (existing) {
    console.log('  User already exists — updating password…')
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) { console.error('  Failed to update password:', error.message); process.exit(1) }
    userId = existing.id
  } else {
    console.log('  Creating new auth user…')
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Administrator' },
    })
    if (error) { console.error('  Failed to create user:', error.message); process.exit(1) }
    userId = data.user.id
  }

  // Upsert profile with admin role
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: userId,
    email: EMAIL,
    full_name: 'Administrator',
    role: 'admin',
  }, { onConflict: 'id' })

  if (profErr) { console.error('  Failed to set admin role:', profErr.message); process.exit(1) }

  console.log('\n✓ Admin ready!')
  console.log(`   Email:    ${EMAIL}`)
  console.log(`   Password: ${PASSWORD}`)
  console.log(`   Login at: /auth/login  →  then visit /admin`)
}

main().catch(e => { console.error(e); process.exit(1) })
