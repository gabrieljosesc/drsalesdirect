import { formatPrice, slugify } from './utils'

describe('formatPrice', () => {
  it('formats whole and fractional USD amounts', () => {
    expect(formatPrice(0)).toBe('$0.00')
    expect(formatPrice(99)).toBe('$99.00')
    expect(formatPrice(1234.5)).toBe('$1,234.50')
  })
})

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Dermal Fillers')).toBe('dermal-fillers')
  })

  it('strips punctuation and collapses separators', () => {
    expect(slugify('BOTOX® 100u (English/Korean)')).toBe('botox-100u-englishkorean')
    expect(slugify('  Trim  __ me  ')).toBe('trim-me')
  })
})
