import type { SupabaseClient } from '@supabase/supabase-js'
import { splitPeptideTitle, getDoseSiblings } from './peptide-doses'

describe('splitPeptideTitle', () => {
  it('splits a base name and dose from a single-strength title', () => {
    expect(splitPeptideTitle('BPC-157 10mg')).toEqual({ base: 'BPC-157', dose: '10mg' })
    expect(splitPeptideTitle('GHK-Cu 100mg')).toEqual({ base: 'GHK-Cu', dose: '100mg' })
  })

  it('normalizes spacing and casing in the dose', () => {
    expect(splitPeptideTitle('Tesamorelin 10 MG')).toEqual({ base: 'Tesamorelin', dose: '10mg' })
  })

  it('handles decimal doses', () => {
    expect(splitPeptideTitle('Semaglutide 2.5mg')).toEqual({ base: 'Semaglutide', dose: '2.5mg' })
  })

  it('returns dose=null for blends (titles containing +)', () => {
    expect(splitPeptideTitle('BPC 5mg + TB 5mg')).toEqual({ base: 'BPC 5mg + TB 5mg', dose: null })
  })

  it('returns dose=null when there is no mg amount', () => {
    expect(splitPeptideTitle('Kisspeptin-10')).toEqual({ base: 'Kisspeptin-10', dose: null })
  })
})

/** Minimal chainable Supabase stub: from().select().eq().eq() resolves to { data }. */
function fakeSupabase(rows: { slug: string; title: string }[]): SupabaseClient {
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    then: (resolve: (v: { data: typeof rows }) => unknown) => resolve({ data: rows }),
  }
  return chain as unknown as SupabaseClient
}

describe('getDoseSiblings', () => {
  const catalog = [
    { slug: 'bpc-157-10mg', title: 'BPC-157 10mg' },
    { slug: 'bpc-157-20mg', title: 'BPC-157 20mg' },
    { slug: 'ghk-cu-50mg', title: 'GHK-Cu 50mg' },
    { slug: 'tirzepatide-5mg', title: 'Tirzepatide 5mg' },
    { slug: 'tirzepatide-10mg', title: 'Tirzepatide 10mg' },
    { slug: 'tirzepatide-30mg', title: 'Tirzepatide 30mg' },
  ]

  it('returns sibling doses sorted numerically, marking the current one', async () => {
    const product = { slug: 'tirzepatide-30mg', title: 'Tirzepatide 30mg', category_id: 'pep' }
    const result = await getDoseSiblings(fakeSupabase(catalog), product)
    expect(result.map(r => r.dose)).toEqual(['5mg', '10mg', '30mg'])
    expect(result.find(r => r.current)?.slug).toBe('tirzepatide-30mg')
    expect(result.filter(r => r.current)).toHaveLength(1)
  })

  it('returns [] when a peptide has only one strength', async () => {
    const product = { slug: 'ghk-cu-50mg', title: 'GHK-Cu 50mg', category_id: 'pep' }
    const result = await getDoseSiblings(fakeSupabase(catalog), product)
    expect(result).toEqual([])
  })

  it('returns [] for a blend (no parseable dose)', async () => {
    const product = { slug: 'glow', title: 'GLOW BPC-157 10mg + GHK-Cu 50mg', category_id: 'pep' }
    const result = await getDoseSiblings(fakeSupabase(catalog), product)
    expect(result).toEqual([])
  })
})
