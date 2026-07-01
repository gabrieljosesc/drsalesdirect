import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Brands aren't a DB table — products carry the brand in their title (e.g.
 * "BOTOX®", "Restylane"). We map each brand to the product-line keywords that
 * identify it, count matching active products, and link to a search for the
 * brand's flagship line. Counts are real; the link lands on that product line.
 */
type BrandDef = { name: string; keywords: string[]; primary: string }

const BRANDS: BrandDef[] = [
  { name: 'Allergan', keywords: ['botox', 'juvederm', 'natrelle', 'alluzience'], primary: 'juvederm' },
  { name: 'Galderma', keywords: ['restylane', 'dysport', 'sculptra', 'azzalure'], primary: 'restylane' },
  { name: 'Merz', keywords: ['xeomin', 'bocouture', 'belotero', 'radiesse'], primary: 'belotero' },
  { name: 'Teoxane', keywords: ['teosyal', 'teoxane'], primary: 'teosyal' },
  { name: 'Vivacy', keywords: ['stylage', 'vivacy'], primary: 'stylage' },
  { name: 'Fillmed', keywords: ['fillmed', 'art filler', 'm-ha', 'nctf'], primary: 'fillmed' },
  { name: 'Neauvia', keywords: ['neauvia'], primary: 'neauvia' },
  { name: 'Intraline', keywords: ['intraline'], primary: 'intraline' },
  { name: 'IBSA', keywords: ['aliaxin', 'profhilo'], primary: 'aliaxin' },
  { name: 'Sinclair', keywords: ['perfectha', 'ellanse', 'mint'], primary: 'ellanse' },
  { name: 'Croma', keywords: ['saypha', 'princess'], primary: 'saypha' },
]

export type HomeBrand = { name: string; count: number; href: string }

export async function getHomeBrands(supabase: SupabaseClient): Promise<HomeBrand[]> {
  const { data } = await supabase.from('products').select('title').eq('is_active', true)
  const titles = (data ?? []).map(p => String(p.title ?? '').toLowerCase())

  return BRANDS.map(b => {
    const count = titles.filter(t => b.keywords.some(k => t.includes(k))).length
    return { name: b.name, count, href: `/search?q=${encodeURIComponent(b.primary)}` }
  })
    .filter(b => b.count > 0)
    .sort((a, b) => b.count - a.count)
}
