import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAccountUser } from '@/lib/supabase/auth'
import { NotificationsForm } from './notifications-form'

export const metadata: Metadata = { title: 'Notifications' }
export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const user = await getAccountUser()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .single()

  const prefs = (profile?.notification_preferences ?? {}) as {
    email_order_updates?: boolean
    email_product_news?: boolean
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose what we may email you about. Service emails for active orders may still be sent.
        </p>
      </div>
      <NotificationsForm
        emailOrderUpdates={Boolean(prefs.email_order_updates)}
        emailProductNews={Boolean(prefs.email_product_news)}
      />
    </div>
  )
}
