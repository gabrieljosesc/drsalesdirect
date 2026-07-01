'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { digitsOnly, inferBrand, luhnValid, parseExpiryMmYy } from '@/lib/card-validation'
import { encryptCardPan } from '@/lib/payment-card-crypto'

export type SavedCardRow = {
  id: string
  user_id: string
  name_on_card: string
  brand: string | null
  last4: string
  exp_month: number
  exp_year: number
  is_default: boolean
  created_at: string
}

export type SaveCardResult = { ok: true } | { ok: false; message: string }

export async function addSavedCard(formData: FormData): Promise<SaveCardResult> {
  const pan = digitsOnly(String(formData.get('card_number') ?? ''))
  const nameOnCard = String(formData.get('name_on_card') ?? '').trim()
  const expiry = String(formData.get('expiry') ?? '').trim()
  const setDefault = formData.get('set_default') === 'on'

  if (!luhnValid(pan)) return { ok: false, message: 'Please enter a valid card number.' }
  if (nameOnCard.length < 2) return { ok: false, message: 'Please enter the name on card.' }

  const exp = parseExpiryMmYy(expiry)
  if (!exp) return { ok: false, message: 'Expiry must be MM/YY (e.g. 08/27).' }

  const expEnd = new Date(exp.year, exp.month, 0, 23, 59, 59, 999)
  if (expEnd < new Date()) return { ok: false, message: 'This card appears to be expired.' }

  let panEncrypted: string
  try {
    panEncrypted = encryptCardPan(pan)
  } catch {
    return { ok: false, message: 'Saving cards is not configured yet. Add PAYMENT_CARD_SECRET to the server environment.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'You must be signed in.' }

  const { count } = await supabase
    .from('user_saved_cards')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  const willDefault = setDefault || (count ?? 0) === 0

  if (willDefault) {
    await supabase.from('user_saved_cards').update({ is_default: false }).eq('user_id', user.id)
  }

  const { error } = await supabase.from('user_saved_cards').insert({
    user_id: user.id,
    name_on_card: nameOnCard,
    brand: inferBrand(pan),
    last4: pan.slice(-4),
    exp_month: exp.month,
    exp_year: exp.year,
    pan_encrypted: panEncrypted,
    is_default: willDefault,
  })
  if (error) return { ok: false, message: error.message }

  revalidatePath('/account/payment-methods')
  return { ok: true }
}

export async function deleteSavedCard(id: string): Promise<SaveCardResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'You must be signed in.' }

  const { data: row } = await supabase
    .from('user_saved_cards')
    .select('id, is_default')
    .eq('id', id).eq('user_id', user.id)
    .single()
  if (!row) return { ok: false, message: 'Card not found.' }

  const { error } = await supabase.from('user_saved_cards').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { ok: false, message: error.message }

  if (row.is_default) {
    const { data: next } = await supabase
      .from('user_saved_cards')
      .select('id').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle()
    if (next) await supabase.from('user_saved_cards').update({ is_default: true }).eq('id', next.id)
  }

  revalidatePath('/account/payment-methods')
  return { ok: true }
}

export async function setDefaultSavedCard(id: string): Promise<SaveCardResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'You must be signed in.' }

  const { data: row } = await supabase
    .from('user_saved_cards')
    .select('id').eq('id', id).eq('user_id', user.id).single()
  if (!row) return { ok: false, message: 'Card not found.' }

  await supabase.from('user_saved_cards').update({ is_default: false }).eq('user_id', user.id)
  const { error } = await supabase.from('user_saved_cards').update({ is_default: true }).eq('id', id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/account/payment-methods')
  return { ok: true }
}
