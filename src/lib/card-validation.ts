export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function luhnValid(pan: string): boolean {
  const d = digitsOnly(pan)
  if (d.length < 13 || d.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i]!, 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

export function inferBrand(pan: string): string | null {
  const d = digitsOnly(pan)
  if (d.startsWith('4')) return 'visa'
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'mastercard'
  if (/^3[47]/.test(d)) return 'amex'
  if (isDiscoverNumber(d)) return 'discover'
  return null
}

/**
 * Discover IIN ranges: 6011, 65, 644-649, and 622126-622925. Used to warn
 * customers as they type — Discover is not an accepted payment method.
 */
export function isDiscoverNumber(pan: string): boolean {
  const d = digitsOnly(pan)
  if (/^6011/.test(d) || /^65/.test(d) || /^64[4-9]/.test(d)) return true
  if (d.length >= 6) {
    const six = parseInt(d.slice(0, 6), 10)
    return six >= 622126 && six <= 622925
  }
  return /^6221[3-9]/.test(d) || /^622[3-8]/.test(d) || /^6229[01]/.test(d)
}

/** Formats user input as MM/YY with an automatic slash after the month. */
export function formatExpiryMmYyInput(raw: string): string {
  const d = digitsOnly(raw).slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}/${d.slice(2)}`
}

export function parseExpiryMmYy(value: string): { month: number; year: number } | null {
  const t = value.trim()
  const m = t.match(/^(\d{1,2})\s*[/\-]\s*(\d{2}|\d{4})$/)
  if (m) {
    const month = Number(m[1])
    let year = Number(m[2])
    if (month < 1 || month > 12) return null
    if (year < 100) year += 2000
    if (year < 2020 || year > 2100) return null
    return { month, year }
  }
  const d = digitsOnly(t)
  if (d.length === 4) {
    const month = Number(d.slice(0, 2))
    let year = Number(d.slice(2))
    if (month < 1 || month > 12) return null
    if (year < 100) year += 2000
    if (year < 2020 || year > 2100) return null
    return { month, year }
  }
  return null
}
