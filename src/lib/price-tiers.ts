import type { PriceTier, Product } from '@/types'

function isTier(x: unknown): x is PriceTier {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.minQ === 'number' && Number.isFinite(o.minQ) &&
    typeof o.maxQ === 'number' && Number.isFinite(o.maxQ) &&
    typeof o.price === 'number' && Number.isFinite(o.price)
  )
}

/** Normalize price_tiers (jsonb) into a sorted PriceTier[]. */
export function parsePriceTiers(raw: unknown): PriceTier[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isTier).sort((a, b) => a.minQ - b.minQ || a.maxQ - b.maxQ)
}

/** Unit price for a quantity using tier brackets; falls back to base price when no tiers. */
export function unitPriceForQuantity(
  tiers: PriceTier[] | null | undefined,
  qty: number,
  fallback: number
): number {
  const t = tiers?.length ? [...tiers].sort((a, b) => a.minQ - b.minQ) : []
  if (!t.length) return fallback
  const q = Math.max(1, Math.floor(qty))
  for (let i = t.length - 1; i >= 0; i--) {
    if (q >= t[i].minQ && q <= t[i].maxQ) return t[i].price
  }
  if (q < t[0].minQ) return t[0].price
  return t[t.length - 1].price
}

/** Convenience: unit price for a product at a given quantity. */
export function productUnitPrice(product: Product, qty: number): number {
  return unitPriceForQuantity(parsePriceTiers(product.price_tiers), qty, product.base_price)
}

export function tierQuantityLabel(t: PriceTier): string {
  if (t.maxQ >= 1000) return `Buy ${t.minQ}+`
  return `Buy ${t.minQ}–${t.maxQ}`
}
