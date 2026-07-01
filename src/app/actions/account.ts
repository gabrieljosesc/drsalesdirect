'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type ActionState = { ok?: string; error?: string }

// ── Profile (personal + professional details) ───────────────────────────────
const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().max(40).optional(),
  company: z.string().max(200).optional(),
  license_holder_name: z.string().max(200).optional(),
  profession: z.string().max(200).optional(),
  specialty: z.string().max(200).optional(),
  business_phone: z.string().max(40).optional(),
  website: z.string().max(300).optional(),
  license_number: z.string().max(120).optional(),
  license_expiry: z.string().optional(),
  license_state: z.string().max(120).optional(),
  license_country: z.string().max(120).optional(),
})

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const parsed = profileSchema.safeParse({
    full_name: String(formData.get('full_name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    company: String(formData.get('company') ?? ''),
    license_holder_name: String(formData.get('license_holder_name') ?? ''),
    profession: String(formData.get('profession') ?? ''),
    specialty: String(formData.get('specialty') ?? ''),
    business_phone: String(formData.get('business_phone') ?? ''),
    website: String(formData.get('website') ?? ''),
    license_number: String(formData.get('license_number') ?? ''),
    license_expiry: String(formData.get('license_expiry') ?? ''),
    license_state: String(formData.get('license_state') ?? ''),
    license_country: String(formData.get('license_country') ?? ''),
  })
  if (!parsed.success) return { error: 'Please check the highlighted fields.' }

  const v = parsed.data
  const expiry = v.license_expiry && /^\d{4}-\d{2}-\d{2}$/.test(v.license_expiry) ? v.license_expiry : null

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: v.full_name,
      phone: v.phone || null,
      company: v.company || null,
      license_holder_name: v.license_holder_name || null,
      profession: v.profession || null,
      specialty: v.specialty || null,
      business_phone: v.business_phone || null,
      website: v.website || null,
      license_number: v.license_number || null,
      license_expiry: expiry,
      license_state: v.license_state || null,
      license_country: v.license_country || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/account', 'layout')
  revalidatePath('/', 'layout')
  return { ok: 'Profile saved.' }
}

// ── Avatar ──────────────────────────────────────────────────────────────────
export async function uploadAvatar(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const file = formData.get('avatar')
  if (!file || !(file instanceof File) || file.size === 0) return { error: 'Choose an image file.' }
  if (file.size > 1024 * 1024) return { error: 'Image must be 1 MB or smaller.' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Use JPEG, PNG, or WebP.' }
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${user.id}/avatar-${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await supabase.storage.from('avatars').upload(path, buf, {
    contentType: file.type, upsert: true,
  })
  if (upErr) {
    if (/bucket not found/i.test(upErr.message)) {
      return { error: 'Avatar storage not ready. Run supabase/account-features.sql first.' }
    }
    return { error: upErr.message }
  }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (dbErr) return { error: dbErr.message }

  revalidatePath('/account', 'layout')
  return { ok: 'Photo updated.' }
}

export async function removeAvatar(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/account', 'layout')
  return { ok: 'Photo removed.' }
}

// ── Password ────────────────────────────────────────────────────────────────
const passwordSchema = z
  .object({
    newPassword: z.string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'One uppercase letter required')
      .regex(/[0-9]/, 'One number required')
      .regex(/[^A-Za-z0-9]/, 'One special character required'),
    confirmPassword: z.string().min(1),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match.', path: ['confirmPassword'],
  })

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const parsed = passwordSchema.safeParse({
    newPassword: String(formData.get('new_password') ?? ''),
    confirmPassword: String(formData.get('confirm_password') ?? ''),
  })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? 'Password does not meet requirements.' }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword })
  if (error) return { error: error.message }
  return { ok: 'Password updated.' }
}

// ── Notifications ───────────────────────────────────────────────────────────
export async function saveNotificationSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const prefs = {
    email_order_updates: formData.get('email_order_updates') === 'on',
    email_product_news: formData.get('email_product_news') === 'on',
  }
  const { error } = await supabase
    .from('profiles')
    .update({ notification_preferences: prefs, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/account/notifications')
  return { ok: 'Notification preferences saved.' }
}

// ── Privacy ─────────────────────────────────────────────────────────────────
export async function savePrivacySettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const prefs = { analytics_opt_in: formData.get('analytics_opt_in') === 'on' }
  const { error } = await supabase
    .from('profiles')
    .update({ privacy_preferences: prefs, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/account/privacy')
  return { ok: 'Privacy preferences saved.' }
}

// ── Addresses ───────────────────────────────────────────────────────────────
const addressSchema = z.object({
  label: z.string().max(80).optional(),
  recipient_name: z.string().min(1, 'Recipient name is required').max(200),
  phone: z.string().max(40).optional(),
  line1: z.string().min(1, 'Address is required').max(300),
  line2: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  postal_code: z.string().max(40).optional(),
  country: z.string().max(120).optional(),
  is_default: z.boolean().default(false),
})

function readAddress(formData: FormData) {
  return {
    label: String(formData.get('label') ?? ''),
    recipient_name: String(formData.get('recipient_name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    line1: String(formData.get('line1') ?? ''),
    line2: String(formData.get('line2') ?? ''),
    city: String(formData.get('city') ?? ''),
    state: String(formData.get('state') ?? ''),
    postal_code: String(formData.get('postal_code') ?? ''),
    country: String(formData.get('country') ?? ''),
    is_default: formData.get('is_default') === 'on',
  }
}

export async function createAddress(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const parsed = addressSchema.safeParse(readAddress(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please fill required fields.' }

  if (parsed.data.is_default) {
    await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', user.id)
  }
  const { error } = await supabase.from('user_addresses').insert({ user_id: user.id, ...parsed.data })
  if (error) return { error: error.message }
  revalidatePath('/account/addresses')
  redirect('/account/addresses')
}

export async function updateAddress(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Missing address id.' }

  const parsed = addressSchema.safeParse(readAddress(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please fill required fields.' }

  if (parsed.data.is_default) {
    await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', user.id)
  }
  const { error } = await supabase
    .from('user_addresses')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/account/addresses')
  redirect('/account/addresses')
}

export async function deleteAddress(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('user_addresses').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/account/addresses')
}

export async function setDefaultAddress(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const id = String(formData.get('id') ?? '')
  if (!id) return
  await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', user.id)
  await supabase.from('user_addresses')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id)
  revalidatePath('/account/addresses')
}
