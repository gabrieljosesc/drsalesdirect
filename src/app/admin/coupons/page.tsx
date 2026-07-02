import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { createCouponAction, toggleCouponAction, deleteCouponAction } from '@/app/actions/admin'
import type { CouponRow } from '@/app/actions/coupons'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = { title: 'Coupons' }
export const dynamic = 'force-dynamic'

type SearchParams = { error?: string; saved?: string }

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]'
const labelClass = 'block text-sm font-medium text-gray-700'

export default async function AdminCouponsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const svc = createAdminClient()
  const { data: rows } = await svc
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  const coupons = (rows ?? []) as CouponRow[]
  const now = new Date()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
      <p className="mt-1 text-sm text-gray-500">Discount codes customers can redeem at checkout.</p>

      {sp.error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{sp.error}</div>
      )}
      {sp.saved && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Coupon created.</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        {/* Create form */}
        <form action={createCouponAction} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">New Coupon</h2>

          <label className={labelClass}>
            Code *
            <input name="code" required placeholder="WELCOME10" className={`${inputClass} font-mono uppercase`} />
          </label>

          <label className={labelClass}>
            Description
            <input name="description" placeholder="10% off first order" className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Type *
              <select name="kind" className={inputClass}>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </label>
            <label className={labelClass}>
              Value *
              <input name="value" type="number" step="0.01" min="0.01" required placeholder="10" className={inputClass} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Min. subtotal
              <input name="min_subtotal" type="number" step="0.01" min="0" placeholder="0" className={inputClass} />
            </label>
            <label className={labelClass}>
              Max uses
              <input name="max_uses" type="number" min="1" placeholder="Unlimited" className={inputClass} />
            </label>
          </div>

          <label className={labelClass}>
            Expires
            <input name="expires_at" type="date" className={inputClass} />
          </label>

          <button type="submit" className="w-full rounded-md bg-[#ec6a82] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d95672]">
            Create Coupon
          </button>
        </form>

        {/* List */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Conditions</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                const expired = c.expires_at ? new Date(c.expires_at) < now : false
                const exhausted = c.max_uses !== null && c.used_count >= c.max_uses
                return (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-[#ec6a82]">{c.code.toUpperCase()}</span>
                      {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {c.kind === 'percent' ? `${Number(c.value)}%` : formatPrice(Number(c.value))}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {Number(c.min_subtotal) > 0 && <div>Min {formatPrice(Number(c.min_subtotal))}</div>}
                      {c.expires_at && (
                        <div className={expired ? 'text-red-600' : ''}>
                          {expired ? 'Expired' : 'Expires'} {new Date(c.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                      {Number(c.min_subtotal) === 0 && !c.expires_at && <span>—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.used_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ''}
                      {exhausted && <span className="ml-1.5 text-xs text-red-600">(limit reached)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.is_active && !expired && !exhausted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.is_active ? (expired ? 'Expired' : exhausted ? 'Exhausted' : 'Active') : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <form action={toggleCouponAction} className="inline">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={String(!c.is_active)} />
                        <button type="submit" className="text-xs font-medium text-[#ec6a82] hover:underline">
                          {c.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </form>
                      <form action={deleteCouponAction} className="inline ml-3">
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
              {coupons.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No coupons yet. Create your first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
