'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Trash2, Minus, Plus, ShoppingCart } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { productUnitPrice } from '@/lib/price-tiers'
import { meetsCheckoutMinimumUsd } from '@/lib/cart-minimum'
import { computeShipping, FREE_SHIPPING_THRESHOLD, SHIPPING_RATES_TEXT } from '@/lib/shipping'
import { CartMinimumBar } from '@/components/CartMinimumBar'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export default function CartPage() {
  const {
    items, selectedItems, selectedTotal,
    updateQuantity, removeFromCart, toggleSelected, setAllSelected,
  } = useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Add some products to get started.</p>
        <Link href="/shop" className={cn(buttonVariants(), 'bg-[#ec6a82] hover:bg-[#d95672]')}>
          Browse Products
        </Link>
      </div>
    )
  }

  const allSelected = selectedItems.length === items.length
  const minimumMet = meetsCheckoutMinimumUsd(selectedTotal)
  const canCheckout = selectedItems.length > 0 && minimumMet
  // Estimated by amount tier; first-time customers ship free (applied at checkout)
  const estimatedShipping = computeShipping(selectedTotal)
  const freeShipping = estimatedShipping === 0 && selectedTotal > 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Shopping Cart</h1>

      {/* Minimum-order progress (based on selected items, same as checkout) */}
      <div className="mb-6">
        <CartMinimumBar amountUsd={selectedTotal} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          <label className="flex items-center gap-2 px-1 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={e => setAllSelected(e.target.checked)}
              className="size-4 rounded border-gray-400 accent-[#ec6a82]"
            />
            <span>Select all ({items.length} item{items.length !== 1 ? 's' : ''})</span>
          </label>

          {items.map(item => {
            const imageUrl = item.product.images?.[0]?.url ?? null
            const unitPrice = productUnitPrice(item.product, item.quantity)
            const selected = item.selected !== false
            return (
              <div
                key={item.id}
                className={cn(
                  'bg-white rounded-lg border p-4 flex gap-3 items-start transition-opacity',
                  !selected && 'opacity-60'
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSelected(item.product_id)}
                  aria-label={`Include ${item.product.title} in checkout`}
                  className="mt-8 size-4 flex-shrink-0 rounded border-gray-400 accent-[#ec6a82] cursor-pointer"
                />
                <div className="relative w-20 h-20 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={item.product.title} fill className="object-contain p-2" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-200">
                      <ShoppingCart className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.product.slug}`} className="font-medium text-gray-800 hover:text-[#ec6a82] line-clamp-2 text-sm">
                    {item.product.title}
                  </Link>
                  {item.product.category && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.product.category.name}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{formatPrice(unitPrice)} / unit</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border rounded-md">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="px-2 py-1 hover:bg-gray-50"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="px-2 py-1 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-800">{formatPrice(unitPrice * item.quantity)}</span>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border p-5 sticky top-24">
            <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Selected items</span>
                <span>{selectedItems.length} of {items.length}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (selected)</span>
                <span>{formatPrice(selectedTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping (estimated)</span>
                <span className={freeShipping ? 'text-green-600 font-medium' : ''}>
                  {freeShipping ? 'FREE' : formatPrice(estimatedShipping)}
                </span>
              </div>
              <p className="text-xs text-gray-500 pt-1">{SHIPPING_RATES_TEXT} First order ships free.</p>
            </div>
            {!freeShipping && selectedTotal > 0 && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded p-2 mb-4">
                Add {formatPrice(FREE_SHIPPING_THRESHOLD - selectedTotal)} more for free shipping!
              </p>
            )}
            <Separator className="mb-4" />
            <div className="flex justify-between font-bold text-gray-900 mb-5">
              <span>Estimated total</span>
              <span>{formatPrice(selectedTotal + estimatedShipping)}</span>
            </div>

            {canCheckout ? (
              <Link href="/checkout" className={cn(buttonVariants({ size: 'lg' }), 'w-full justify-center bg-[#ec6a82] hover:bg-[#d95672]')}>
                Proceed to Checkout
              </Link>
            ) : (
              <button
                disabled
                className={cn(buttonVariants({ size: 'lg' }), 'w-full justify-center bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300')}
                title={selectedItems.length === 0 ? 'Select at least one item' : 'Minimum order not reached'}
              >
                Proceed to Checkout
              </button>
            )}
            {!canCheckout && (
              <p className="mt-2 text-center text-xs text-amber-700">
                {selectedItems.length === 0
                  ? 'Select at least one item to check out.'
                  : 'Reach the minimum order amount to check out.'}
              </p>
            )}
            <Link href="/shop" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full justify-center mt-2')}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
