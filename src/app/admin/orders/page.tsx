import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ q?: string; status?: string }> }

function escapeIlike(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

const STATUS_LABELS: Record<string, string> = {
  pending_csr: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped', cancelled: 'Cancelled',
}
const STATUS_COLORS: Record<string, string> = {
  pending_csr: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const status = (sp.status ?? '').trim()
  const svc = createAdminClient()

  let query = svc
    .from('orders')
    .select('id, reference_number, email, full_name, status, subtotal, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status) query = query.eq('status', status)
  if (q) {
    const term = escapeIlike(q)
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,reference_number.ilike.%${term}%`)
  }

  const { data: orders } = await query

  const filters = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending_csr' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders?.length ?? 0} shown</p>
        </div>
        <form method="get" className="flex gap-2">
          <input
            type="search" name="q" defaultValue={q}
            placeholder="Search reference, name, email"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm w-64"
          />
          <button type="submit" className="rounded-md bg-[#ec6a82] px-3 py-2 text-sm font-medium text-white hover:bg-[#152f4a]">Search</button>
          {q && <Link href="/admin/orders" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Clear</Link>}
        </form>
      </div>

      {/* Status filter pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map(f => {
          const params = new URLSearchParams()
          if (f.value) params.set('status', f.value)
          if (q) params.set('q', q)
          const href = `/admin/orders${params.toString() ? `?${params}` : ''}`
          const active = status === f.value
          return (
            <Link
              key={f.label}
              href={href}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                active ? 'bg-[#ec6a82] text-white border-[#ec6a82]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map(o => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-[#ec6a82] hover:underline">
                    {o.reference_number ?? o.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{o.full_name}</div>
                  <div className="text-xs text-gray-400">{o.email}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">{formatPrice(Number(o.subtotal))}</td>
              </tr>
            ))}
            {(orders ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No orders found{q ? ` for "${q}"` : ''}.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
