import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import { Package, ShoppingBag, Users, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const svc = createAdminClient()

  const [
    { count: productCount },
    { count: orderCount },
    { count: userCount },
    { count: pendingCount },
    { data: recentOrders },
  ] = await Promise.all([
    svc.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    svc.from('orders').select('id', { count: 'exact', head: true }),
    svc.from('profiles').select('id', { count: 'exact', head: true }),
    svc.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending_csr'),
    svc.from('orders')
      .select('id, reference_number, full_name, email, status, subtotal, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const stats = [
    { label: 'Active Products', value: productCount ?? 0, icon: Package, href: '/admin/products' },
    { label: 'Total Orders', value: orderCount ?? 0, icon: ShoppingBag, href: '/admin/orders' },
    { label: 'Pending Review', value: pendingCount ?? 0, icon: Clock, href: '/admin/orders?status=pending_csr' },
    { label: 'Registered Users', value: userCount ?? 0, icon: Users, href: '/admin/users' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Manage products, orders, users, and content.</p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-[#ec6a82] hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900">{value}</span>
              <div className="w-10 h-10 rounded-full bg-[#ec6a82]/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#ec6a82]" />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-[#ec6a82] hover:underline">View all →</Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(recentOrders ?? []).map(o => (
                <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-[#ec6a82] hover:underline">
                      {o.reference_number ?? o.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{o.full_name}</div>
                    <div className="text-xs text-gray-400">{o.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{formatPrice(Number(o.subtotal))}</td>
                </tr>
              ))}
              {(recentOrders ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_csr: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    pending_csr: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped', cancelled: 'Cancelled',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}
