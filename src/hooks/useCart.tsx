'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { CartItem, Product } from '@/types'
import {
  getCart,
  addToCart as addToCartLib,
  removeFromCart as removeFromCartLib,
  updateCartQuantity as updateCartQuantityLib,
  clearCart as clearCartLib,
  clearSelected as clearSelectedLib,
  toggleItemSelected as toggleSelectedLib,
  setAllSelected as setAllSelectedLib,
  getCartTotal,
  getCartCount,
  getSelectedItems,
  getSelectedTotal,
} from '@/lib/cart'

interface CartContextValue {
  items: CartItem[]
  count: number
  total: number
  /** Lines included in checkout (selected). */
  selectedItems: CartItem[]
  selectedTotal: number
  addToCart: (product: Product, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  toggleSelected: (productId: string) => void
  setAllSelected: (selected: boolean) => void
  clearCart: () => void
  /** Removes only the checked-out (selected) lines. */
  clearSelected: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    setItems(getCart())
  }, [])

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setItems(addToCartLib(product, quantity))
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setItems(removeFromCartLib(productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems(updateCartQuantityLib(productId, quantity))
  }, [])

  const toggleSelected = useCallback((productId: string) => {
    setItems(toggleSelectedLib(productId))
  }, [])

  const setAllSelected = useCallback((selected: boolean) => {
    setItems(setAllSelectedLib(selected))
  }, [])

  const clearCart = useCallback(() => {
    clearCartLib()
    setItems([])
  }, [])

  const clearSelected = useCallback(() => {
    setItems(clearSelectedLib())
  }, [])

  return (
    <CartContext.Provider value={{
      items,
      count: getCartCount(items),
      total: getCartTotal(items),
      selectedItems: getSelectedItems(items),
      selectedTotal: getSelectedTotal(items),
      addToCart,
      removeFromCart,
      updateQuantity,
      toggleSelected,
      setAllSelected,
      clearCart,
      clearSelected,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
