import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAccountUser } from '@/lib/supabase/auth'
import { PrivacyForm } from './privacy-form'

export const metadata: Metadata = { title: 'Privacy' }
export const dynamic = 'force-dynamic'

export default async function PrivacyPage() {
  const user = await getAccountUser()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('privacy_preferences')
    .eq('id', user.id)
    .single()

  const prefs = (profile?.privacy_preferences ?? {}) as { analytics_opt_in?: boolean }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy</h1>
        <p className="mt-1 text-sm text-gray-500">Control how your data is used.</p>
      </div>
      <PrivacyForm analyticsOptIn={Boolean(prefs.analytics_opt_in)} />
    </div>
  )
}
