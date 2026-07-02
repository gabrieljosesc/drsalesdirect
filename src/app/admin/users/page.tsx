import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { ResetPasswordButton } from './reset-password-button'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ q?: string }> }

export default async function AdminUsersPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const svc = createAdminClient()

  const { data: profiles } = await svc
    .from('profiles')
    .select('id, email, full_name, phone, company, role, license_number, license_expiry, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)

  const rows = (profiles ?? []).filter(p => {
    if (!q) return true
    const haystack = [p.email, p.full_name, p.phone, p.company, p.license_number].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {rows.length} account{rows.length !== 1 ? 's' : ''}{q ? ` matching "${q}"` : ''}
          </p>
        </div>
        <form method="get" className="flex gap-2">
          <input
            type="search" name="q" defaultValue={q}
            placeholder="Search name, email, license #"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm w-64"
          />
          <button type="submit" className="rounded-md bg-[#ec6a82] px-3 py-2 text-sm font-medium text-white hover:bg-[#d95672]">Search</button>
          {q && <Link href="/admin/users" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Clear</Link>}
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">License #</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3 text-center">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/users/${u.id}`} className="text-[#ec6a82] hover:underline">
                    {u.full_name || '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{u.license_number ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{u.company ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  {u.role === 'admin'
                    ? <span className="rounded-full bg-[#ec6a82] px-2 py-0.5 text-xs font-medium text-white">Admin</span>
                    : <span className="text-xs text-gray-400">Customer</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/admin/users/${u.id}`} className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100">View</Link>
                    <ResetPasswordButton userId={u.id} />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No accounts found{q ? ` for "${q}"` : ''}.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
