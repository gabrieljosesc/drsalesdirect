import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAccountUser } from '@/lib/supabase/auth'
import type { SavedCardRow } from '@/app/actions/saved-cards'
import { PaymentMethodsClient } from './payment-methods-client'

export const metadata: Metadata = { title: 'Banks & Cards' }
export const dynamic = 'force-dynamic'

export default async function PaymentMethodsPage() {
  const user = await getAccountUser()
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('user_saved_cards')
    .select('id, user_id, name_on_card, brand, last4, exp_month, exp_year, is_default, created_at')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Banks &amp; Cards</h1>
        <p className="mt-1 text-sm text-gray-500">
          Save a card for faster checkout. Card numbers are encrypted on the server and can be
          accessed only by authorized admin users when needed for order processing.
        </p>
      </div>
      <PaymentMethodsClient initialMethods={(error ? [] : rows ?? []) as SavedCardRow[]} />
    </div>
  )
}
