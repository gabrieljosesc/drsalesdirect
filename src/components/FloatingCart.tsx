'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/hooks/useCart'

/**
 * Floating cart button shown only on mobile (bottom-right). Mirrors the cart
 * count from the cart context. Hidden on `md` and up (the top bar already has
 * a cart button) and on cart/checkout/admin pages.
 */
export function FloatingCart() {
  const { count } = useCart()
  const pathname = usePathname()

  if (
    count === 0 ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/admin')
  ) {
    return null
  }

  return (
    <Link
      href="/cart"
      aria-label={`View cart, ${count} items`}
      className="fixed bottom-4 right-4 z-[80] inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#ec6a82] shadow-lg ring-1 ring-gray-200 transition hover:bg-blue-50 md:hidden"
    >
      <ShoppingCart className="h-6 w-6" />
      <span
        className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ec6a82] px-1 text-[11px] font-semibold text-white shadow"
        aria-hidden
      >
        {count > 9 ? '9+' : count}
      </span>
    </Link>
  )
}
