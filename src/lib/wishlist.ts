'use client'

import { Product } from '@/types'

const WISHLIST_KEY = 'pmw_wishlist'

export function getWishlist(): Product[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(WISHLIST_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveWishlist(items: Product[]): void {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items))
}

export function toggleWishlist(product: Product): Product[] {
  const items = getWishlist()
  const exists = items.some(p => p.id === product.id)
  const next = exists ? items.filter(p => p.id !== product.id) : [...items, product]
  saveWishlist(next)
  return next
}

export function removeFromWishlist(productId: string): Product[] {
  const next = getWishlist().filter(p => p.id !== productId)
  saveWishlist(next)
  return next
}
