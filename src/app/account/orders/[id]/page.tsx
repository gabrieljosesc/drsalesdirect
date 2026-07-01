import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getAccountUser } from '@/lib/supabase/auth'
import { Order, OrderItem } from '@/types'
import { formatPrice } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const statusColors: Record<string, string> = {
  pending_csr: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending_csr: 'Pending Review',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  cancelled: 'Cancelled',
}

type ItemWithProduct = OrderItem & {
  product?: { slug: string; images?: { url: string; sort_order: number }[] } | null
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAccountUser()
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(slug, images:product_images(url, sort_order)))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!order) notFound()

  const addr = order.shipping_address as Order['shipping_address']
  const billing = (order.billing_address ?? null) as Order['shipping_address'] | null
  const hasBilling = Boolean(billing?.address_line1)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Order Details</h1>
          <p className="text-sm font-mono text-[#ec6a82] mt-1">{order.reference_number}</p>
        </div>
        <Link href="/account/orders" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          ← Orders
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {/* Items */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Items Ordered</h2>
            <div className="space-y-4">
              {(order.items as ItemWithProduct[]).map(item => {
                const imageUrl = item.product?.images?.[0]?.url ?? null
                const slug = item.product?.slug ?? null
                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative w-16 h-16 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                      {imageUrl ? (
                        <Image src={imageUrl} alt={item.title} fill className="object-contain p-1.5" sizes="64px" />
                      ) : (
                        <div className="absolute inset-0 bg-gray-100" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {slug ? (
                        <Link href={`/product/${slug}`} className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-[#ec6a82]">
                          {item.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{item.title}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity} × {formatPrice(item.unit_price)}</p>
                    </div>
                    <p className="font-semibold text-sm text-gray-800 flex-shrink-0">{formatPrice(item.unit_price * item.quantity)}</p>
                  </div>
                )
              })}
            </div>
            <Separator className="my-4" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {Number(order.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                  <span>−{formatPrice(Number(order.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{Number(order.shipping_amount ?? 0) > 0 ? formatPrice(Number(order.shipping_amount)) : 'Free'}</span>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(Number(order.total ?? order.subtotal))}</span>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid sm:grid-cols-2 gap-4">
            {hasBilling && billing && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-800 mb-3">Billing Address</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {billing.first_name} {billing.last_name}<br />
                  {billing.company && <>{billing.company}<br /></>}
                  {billing.address_line1}<br />
                  {billing.address_line2 && <>{billing.address_line2}<br /></>}
                  {billing.city}, {billing.state} {billing.zip}<br />
                  {billing.country}<br />
                  {billing.phone}
                </p>
              </div>
            )}
            <div className={`bg-white rounded-xl border p-5 ${hasBilling ? '' : 'sm:col-span-2'}`}>
              <h2 className="font-semibold text-gray-800 mb-3">Shipping Address</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {addr.first_name} {addr.last_name}<br />
                {addr.company && <>{addr.company}<br /></>}
                {addr.address_line1}<br />
                {addr.address_line2 && <>{addr.address_line2}<br /></>}
                {addr.city}, {addr.state} {addr.zip}<br />
                {addr.country}<br />
                {addr.phone}
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Order Status</h2>
            <span className={`inline-block text-sm font-medium px-3 py-1.5 rounded-full ${statusColors[order.status]}`}>
              {statusLabels[order.status] ?? order.status}
            </span>
            <p className="text-xs text-gray-500">
              Placed {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
            {order.notes && (
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-700 mb-1">Your Notes</p>
                <p className="text-xs text-gray-500">{order.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
