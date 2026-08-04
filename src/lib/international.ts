/**
 * International-order detection. The company ships domestically from the US;
 * any shipping/billing address outside the United States is "international"
 * and goes through the secure-payment-link + photo-ID verification flow.
 */
const US_NAMES = new Set([
  'us', 'usa', 'united states', 'united states of america',
  'america', 'estados unidos',
])

export function isInternationalCountry(country: string | null | undefined): boolean {
  // "U.S.A." → "usa"; periods carry no meaning in country names
  const c = String(country ?? '').trim().toLowerCase().replace(/\./g, '')
  if (!c) return false // unknown ≠ international; validation still requires a country
  return !US_NAMES.has(c)
}
