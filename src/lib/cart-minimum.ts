/** Minimum selected cart subtotal (USD) required to place an order / check out. */
export const MIN_CHECKOUT_SUBTOTAL_USD = 300

export function meetsCheckoutMinimumUsd(subtotal: number): boolean {
  return Number.isFinite(subtotal) && subtotal >= MIN_CHECKOUT_SUBTOTAL_USD
}
