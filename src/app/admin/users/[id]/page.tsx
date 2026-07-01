import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import { ResetPasswordButton } from '../reset-password-button'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

const STATUS_LABELS: Record<string, string> = {
  pending_csr: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped', cancelled: 'Cancelled',
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params
  const svc = createAdminClient()

  const [{ data: profile }, { data: orders }] = await Promise.all([
    svc.from('profiles').select('*').eq('id', id).single(),
    svc.from('orders')
      .select('id, reference_number, status, subtotal, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  if (!profile) notFound()

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-gray-500">{label}</dt>
      <dd className="text-gray-900 break-all">{value || '—'}</dd>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-[#ec6a82] hover:underline">← Users</Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">{profile.full_name || '—'}</h1>
        <p className="text-sm text-gray-500">{profile.email ?? 'No email'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Profile */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Profile</h2>
          <dl className="mt-3 space-y-1 text-sm">
            {row('Full name', profile.full_name)}
            {row('Email', profile.email)}
            {row('Phone', profile.phone)}
            {row('Company', profile.company)}
            {row('Role', <span className="capitalize">{profile.role ?? 'customer'}</span>)}
            {row('Joined', profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—')}
          </dl>
        </section>

        {/* License + address */}
        <section className="rounded-xl border border-[#ec6a82]/20 bg-blue-50/50 p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#ec6a82]">License & Address</h2>
          <dl className="mt-3 space-y-1 text-sm">
            {row('Name', profile.license_holder_name)}
            {row('License Type', profile.profession)}
            {row('License #', <span className="font-mono">{profile.license_number}</span>)}
            {row('Expiry', profile.license_expiry ? String(profile.license_expiry).slice(0, 10) : '—')}
            {row('State issued', profile.license_state)}
            {row('Country', profile.license_country)}
            {row('Address', [profile.address_line1, profile.city, profile.state, profile.postal_code].filter(Boolean).join(', '))}
          </dl>
        </section>
      </div>

      {/* Order history */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Order History ({orders?.length ?? 0})
        </h2>
        {!orders || orders.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No orders placed.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <th className="py-1 pr-3 text-left">Reference</th>
                <th className="py-1 pr-3 text-left">Date</th>
                <th className="py-1 pr-3 text-left">Status</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-gray-50">
                  <td className="py-1.5 pr-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-[#ec6a82] hover:underline">
                      {o.reference_number ?? o.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3 text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="py-1.5 pr-3 text-xs">{STATUS_LABELS[o.status] ?? o.status}</td>
                  <td className="py-1.5 text-right font-medium text-gray-900">{formatPrice(Number(o.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex gap-3">
        <ResetPasswordButton userId={profile.id} />
      </div>
    </div>
  )
}
