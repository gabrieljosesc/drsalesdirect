import {
  computeShipping,
  FREE_SHIPPING_THRESHOLD,
  MID_SHIPPING_THRESHOLD,
  MID_SHIPPING_RATE,
  BASE_SHIPPING_RATE,
  SHIPPING_RATES_TEXT,
} from './shipping'

describe('computeShipping — tiered rates', () => {
  it('is free at or above the free threshold ($795+)', () => {
    expect(computeShipping(FREE_SHIPPING_THRESHOLD)).toBe(0)
    expect(computeShipping(FREE_SHIPPING_THRESHOLD + 50)).toBe(0)
    expect(computeShipping(2000)).toBe(0)
  })

  it('charges the mid rate ($50) from $498 up to (but not including) $795', () => {
    expect(computeShipping(MID_SHIPPING_THRESHOLD)).toBe(MID_SHIPPING_RATE) // exactly 498
    expect(computeShipping(650)).toBe(MID_SHIPPING_RATE)
    expect(computeShipping(FREE_SHIPPING_THRESHOLD - 0.01)).toBe(MID_SHIPPING_RATE) // 794.99
  })

  it('charges the base rate ($100) below $498', () => {
    expect(computeShipping(MID_SHIPPING_THRESHOLD - 0.01)).toBe(BASE_SHIPPING_RATE) // 497.99
    expect(computeShipping(300)).toBe(BASE_SHIPPING_RATE)
    expect(computeShipping(1)).toBe(BASE_SHIPPING_RATE)
  })

  it('charges nothing for a zero or negative subtotal', () => {
    expect(computeShipping(0)).toBe(0)
    expect(computeShipping(-25)).toBe(0)
  })
})

describe('computeShipping — first-order promo', () => {
  it('ships the first order free regardless of amount', () => {
    expect(computeShipping(100, true)).toBe(0)
    expect(computeShipping(499.99, true)).toBe(0)
    expect(computeShipping(750, true)).toBe(0)
  })

  it('still charges nothing for an empty first order', () => {
    expect(computeShipping(0, true)).toBe(0)
  })
})

describe('SHIPPING_RATES_TEXT', () => {
  it('mentions all three tier amounts so the copy stays in sync with the logic', () => {
    expect(SHIPPING_RATES_TEXT).toContain(String(FREE_SHIPPING_THRESHOLD))
    expect(SHIPPING_RATES_TEXT).toContain(String(MID_SHIPPING_THRESHOLD))
    expect(SHIPPING_RATES_TEXT).toContain(String(MID_SHIPPING_RATE))
    expect(SHIPPING_RATES_TEXT).toContain(String(BASE_SHIPPING_RATE))
  })
})
