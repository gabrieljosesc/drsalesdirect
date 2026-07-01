'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { registerSchema, flattenErrors } from '@/app/auth/register/schema'

// ── Types ─────────────────────────────────────────────────────────────────
export type RegisterState =
  | null
  | { fieldErrors: Record<string, string>; values?: Record<string, string> }
  | { error: string }

export type LoginState =
  | null
  | { error: string }

// ── Register ──────────────────────────────────────────────────────────────
export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const raw = {
    email:           String(formData.get('email')           ?? ''),
    confirm_email:   String(formData.get('confirm_email')   ?? ''),
    password:        String(formData.get('password')        ?? ''),
    confirm_password:String(formData.get('confirm_password')?? ''),
    prefix:          String(formData.get('prefix')          ?? ''),
    first_name:      String(formData.get('first_name')      ?? ''),
    middle_name:     String(formData.get('middle_name')     ?? ''),
    last_name:       String(formData.get('last_name')       ?? ''),
    phone:           String(formData.get('phone')           ?? ''),
    company:         String(formData.get('company')         ?? ''),
    license_holder_name: String(formData.get('license_holder_name') ?? ''),
    profession:      String(formData.get('profession')      ?? ''),
    specialty:       String(formData.get('specialty')       ?? ''),
    license_number:  String(formData.get('license_number')  ?? ''),
    license_expiry:  String(formData.get('license_expiry')  ?? ''),
    license_state:   String(formData.get('license_state')   ?? ''),
    license_country: String(formData.get('license_country') ?? ''),
    business_phone:  String(formData.get('business_phone')  ?? ''),
    website:         String(formData.get('website')         ?? ''),

    // Delivery address
    address_line1:   String(formData.get('address_line1')   ?? ''),
    city:            String(formData.get('city')             ?? ''),
    state:           String(formData.get('state')            ?? ''),
    postal_code:     String(formData.get('postal_code')      ?? ''),
    country:         String(formData.get('country')          ?? ''),
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      fieldErrors: flattenErrors(parsed.error),
      values: { ...raw, password: '', confirm_password: '' },
    }
  }

  const v = parsed.data
  const fullName = [v.prefix, v.first_name, v.middle_name, v.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      data: { full_name: fullName },
      // PKCE: exchange code in /auth/callback, then land on homepage signed in.
      emailRedirectTo: `${siteUrl}/auth/callback?next=/`,
    },
  })

  if (error) {
    if (error.message?.toLowerCase().includes('already registered')) {
      return { fieldErrors: { email: 'An account with this email already exists.' }, values: { ...raw, password: '', confirm_password: '' } }
    }
    return { error: error.message }
  }

  if (data.user) {
    // Use admin client: during email-confirmation signup there is no session yet,
    // so the anon client would be blocked by RLS. Service role bypasses RLS.
    const admin = createAdminClient()

    await admin.from('profiles').upsert({
      id:              data.user.id,
      email:           v.email,
      full_name:       fullName,
      phone:           v.phone           || null,
      company:         v.company         || null,
      license_holder_name: v.license_holder_name || null,
      profession:      v.profession      || null,
      specialty:       v.specialty       || null,
      license_number:  v.license_number  || null,
      license_expiry:  v.license_expiry  || null,
      license_state:   v.license_state   || null,
      license_country: v.license_country || null,
      business_phone:  v.business_phone  || null,
      website:         v.website         || null,
      address_line1:   v.address_line1   || null,
      city:            v.city            || null,
      state:           v.state           || null,
      postal_code:     v.postal_code     || null,
      country:         v.country         || null,
      role:            'customer',
    }, { onConflict: 'id' })

    // Create a default saved address from the registration delivery address
    if (v.address_line1) {
      await admin.from('user_addresses').insert({
        user_id:        data.user.id,
        label:          'Primary',
        recipient_name: fullName || v.email,
        phone:          v.phone || null,
        line1:          v.address_line1,
        city:           v.city || null,
        state:          v.state || null,
        postal_code:    v.postal_code || null,
        country:        v.country || null,
        is_default:     true,
      })
    }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/login?registered=1')
}

// ── Login ─────────────────────────────────────────────────────────────────
export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email    = String(formData.get('email')    ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next     = String(formData.get('next')     ?? '/')

  if (!email || !password) return { error: 'Email and password are required.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (!error) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { error: 'Sign-in succeeded but the session was not saved. Please try again.' }
    }
  }

  if (error) {
    if (/invalid login/i.test(error.message) || /invalid credentials/i.test(error.message)) {
      return { error: 'Incorrect email or password.' }
    }
    if (/email not confirmed/i.test(error.message)) {
      return { error: 'Please verify your email before signing in. Check your inbox.' }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(next || '/')
}

// ── Logout ────────────────────────────────────────────────────────────────
// Must be a POST server action: a GET /auth/logout route gets prefetched by
// <Link>, silently destroying the session whenever the link is on screen.
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

// ── Forgot password ───────────────────────────────────────────────────────
export async function forgotPasswordAction(
  _prev: { sent?: boolean; error?: string } | null,
  formData: FormData
): Promise<{ sent?: boolean; error?: string }> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Email is required.' }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
  })

  // Always return success — don't reveal whether email exists
  if (error) console.error('resetPasswordForEmail:', error.message)
  return { sent: true }
}
