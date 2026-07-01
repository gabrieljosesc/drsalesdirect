import { createClient } from '@/lib/supabase/server'
import { requireAuthUser } from '@/lib/supabase/auth'
import { AccountSidebar } from '@/components/account/AccountSidebar'
import { AccountMobileTabs } from '@/components/account/AccountMobileTabs'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthUser('/account/profile')
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  const email = profile?.email ?? user.email ?? ''
  const displayName = (profile?.full_name && profile.full_name.trim()) || email.split('@')[0] || 'Account'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
        <div className="hidden lg:block">
          <AccountSidebar displayName={displayName} email={email} avatarUrl={profile?.avatar_url ?? null} />
        </div>
        <div className="min-w-0">
          <AccountMobileTabs />
          {children}
        </div>
      </div>
    </div>
  )
}
