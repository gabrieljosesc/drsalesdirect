import { meetsCheckoutMinimumUsd, MIN_CHECKOUT_SUBTOTAL_USD } from './cart-minimum'

describe('meetsCheckoutMinimumUsd', () => {
  it('accepts subtotals at or above the minimum', () => {
    expect(meetsCheckoutMinimumUsd(MIN_CHECKOUT_SUBTOTAL_USD)).toBe(true)
    expect(meetsCheckoutMinimumUsd(MIN_CHECKOUT_SUBTOTAL_USD + 1)).toBe(true)
  })

  it('rejects subtotals below the minimum', () => {
    expect(meetsCheckoutMinimumUsd(MIN_CHECKOUT_SUBTOTAL_USD - 0.01)).toBe(false)
    expect(meetsCheckoutMinimumUsd(0)).toBe(false)
  })

  it('rejects non-finite values (guarded by Number.isFinite)', () => {
    expect(meetsCheckoutMinimumUsd(NaN)).toBe(false)
    expect(meetsCheckoutMinimumUsd(Infinity)).toBe(false)
  })
})
