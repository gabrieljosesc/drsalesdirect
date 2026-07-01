import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getAccountUser } from '@/lib/supabase/auth'
import { ProfileForms } from './profile-forms'

export const metadata: Metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

function maskEmail(e: string): string {
  const at = e.indexOf('@')
  if (at <= 1) return e
  const local = e.slice(0, at)
  return `${local.slice(0, 2)}${'•'.repeat(Math.min(8, local.length - 2))}${e.slice(at)}`
}

export default async function ProfilePage() {
  const user = await getAccountUser()
  const supabase = await createClient()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const email = profile?.email ?? user.email ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your contact and professional details.</p>
      </div>

      <ProfileForms
        profile={{
          full_name: profile?.full_name ?? '',
          phone: profile?.phone ?? '',
          company: profile?.company ?? '',
          profession: profile?.profession ?? '',
          license_holder_name: profile?.license_holder_name ?? '',
          specialty: profile?.specialty ?? '',
          business_phone: profile?.business_phone ?? '',
          website: profile?.website ?? '',
          license_number: profile?.license_number ?? '',
          license_expiry: profile?.license_expiry ?? '',
          license_state: profile?.license_state ?? '',
          license_country: profile?.license_country ?? '',
          avatar_url: profile?.avatar_url ?? null,
        }}
        emailMasked={maskEmail(email)}
      />
    </div>
  )
}
