import { parsePriceTiers, unitPriceForQuantity, tierQuantityLabel } from './price-tiers'
import type { PriceTier } from '@/types'

const tiers: PriceTier[] = [
  { minQ: 1, maxQ: 4, price: 100 },
  { minQ: 5, maxQ: 9, price: 90 },
  { minQ: 10, maxQ: 1000, price: 80 },
]

describe('parsePriceTiers', () => {
  it('returns [] for non-array / malformed input', () => {
    expect(parsePriceTiers(null)).toEqual([])
    expect(parsePriceTiers(undefined)).toEqual([])
    expect(parsePriceTiers('nope')).toEqual([])
    expect(parsePriceTiers([{ minQ: 1 }])).toEqual([]) // missing fields
  })

  it('keeps valid tiers and sorts them by minQ', () => {
    const unsorted = [
      { minQ: 10, maxQ: 1000, price: 80 },
      { minQ: 1, maxQ: 4, price: 100 },
    ]
    expect(parsePriceTiers(unsorted).map(t => t.minQ)).toEqual([1, 10])
  })
})

describe('unitPriceForQuantity', () => {
  it('falls back to the base price when there are no tiers', () => {
    expect(unitPriceForQuantity([], 3, 250)).toBe(250)
  })

  it('selects the bracket the quantity falls into', () => {
    expect(unitPriceForQuantity(tiers, 1, 999)).toBe(100)
    expect(unitPriceForQuantity(tiers, 4, 999)).toBe(100)
    expect(unitPriceForQuantity(tiers, 5, 999)).toBe(90)
    expect(unitPriceForQuantity(tiers, 12, 999)).toBe(80)
  })

  it('clamps to the first tier below the minimum and last tier above the maximum', () => {
    expect(unitPriceForQuantity(tiers, 0, 999)).toBe(100) // below first floor
    expect(unitPriceForQuantity(tiers, 100000, 999)).toBe(80) // above last ceiling
  })
})

describe('tierQuantityLabel', () => {
  it('shows an open-ended label for large ceilings', () => {
    expect(tierQuantityLabel({ minQ: 10, maxQ: 1000, price: 80 })).toBe('Buy 10+')
  })

  it('shows a range label otherwise', () => {
    expect(tierQuantityLabel({ minQ: 5, maxQ: 9, price: 90 })).toBe('Buy 5–9')
  })
})
