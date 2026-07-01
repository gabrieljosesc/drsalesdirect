'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Product } from '@/types'
import {
  getWishlist,
  toggleWishlist as toggleLib,
  removeFromWishlist as removeLib,
} from '@/lib/wishlist'

interface WishlistContextValue {
  items: Product[]
  count: number
  isWishlisted: (productId: string) => boolean
  toggle: (product: Product) => void
  remove: (productId: string) => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([])

  useEffect(() => {
    setItems(getWishlist())
  }, [])

  const toggle = useCallback((product: Product) => {
    setItems(toggleLib(product))
  }, [])

  const remove = useCallback((productId: string) => {
    setItems(removeLib(productId))
  }, [])

  const isWishlisted = useCallback(
    (productId: string) => items.some(p => p.id === productId),
    [items]
  )

  return (
    <WishlistContext.Provider value={{ items, count: items.length, isWishlisted, toggle, remove }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
