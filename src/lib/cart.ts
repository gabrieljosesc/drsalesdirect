'use client'

import { CartItem, Product } from '@/types'
import { productUnitPrice } from '@/lib/price-tiers'

const CART_KEY = 'pmw_cart'

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(CART_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

export function addToCart(product: Product, quantity = 1): CartItem[] {
  const cart = getCart()
  const existing = cart.find(item => item.product_id === product.id)
  if (existing) {
    existing.quantity += quantity
    existing.selected = true
  } else {
    cart.push({
      id: crypto.randomUUID(),
      product_id: product.id,
      quantity,
      product,
      selected: true,
    })
  }
  saveCart(cart)
  return cart
}

/** Older stored carts may not have `selected`; treat missing as selected. */
export function isSelected(item: CartItem): boolean {
  return item.selected !== false
}

export function toggleItemSelected(productId: string): CartItem[] {
  const cart = getCart()
  const item = cart.find(i => i.product_id === productId)
  if (item) item.selected = !isSelected(item)
  saveCart(cart)
  return cart
}

export function setAllSelected(selected: boolean): CartItem[] {
  const cart = getCart().map(i => ({ ...i, selected }))
  saveCart(cart)
  return cart
}

/** Removes the checked-out (selected) lines, keeping unselected ones in the cart. */
export function clearSelected(): CartItem[] {
  const cart = getCart().filter(i => !isSelected(i))
  saveCart(cart)
  return cart
}

export function removeFromCart(productId: string): CartItem[] {
  const cart = getCart().filter(item => item.product_id !== productId)
  saveCart(cart)
  return cart
}

export function updateCartQuantity(productId: string, quantity: number): CartItem[] {
  const cart = getCart()
  const item = cart.find(i => i.product_id === productId)
  if (item) {
    if (quantity <= 0) return removeFromCart(productId)
    item.quantity = quantity
  }
  saveCart(cart)
  return cart
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY)
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce(
    (sum, item) => sum + productUnitPrice(item.product, item.quantity) * item.quantity,
    0
  )
}

export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0)
}

export function getSelectedItems(cart: CartItem[]): CartItem[] {
  return cart.filter(isSelected)
}

export function getSelectedTotal(cart: CartItem[]): number {
  return getCartTotal(getSelectedItems(cart))
}
