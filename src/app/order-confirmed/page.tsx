import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Received!</h1>
      <p className="text-gray-600 mb-6 leading-relaxed">
        Thank you! Your order has been received and is being processed.
      </p>
      {ref && (
        <div className="inline-block bg-gray-100 rounded-lg px-6 py-3 mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Reference Number</p>
          <p className="text-xl font-bold text-[#ec6a82] font-mono">{ref}</p>
        </div>
      )}
      <div className="text-sm text-gray-500 mb-8 bg-blue-50 rounded-lg p-4">
        <p>A confirmation email has been sent to you. You can view this order anytime under <strong>My Orders</strong>.</p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/shop" className={cn(buttonVariants(), 'bg-[#ec6a82] hover:bg-[#152f4a]')}>
          Continue Shopping
        </Link>
        <Link href="/account/orders" className={buttonVariants({ variant: 'outline' })}>
          View My Orders
        </Link>
      </div>
    </div>
  )
}
