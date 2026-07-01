import type { SupabaseClient } from '@supabase/supabase-js'

export type DoseOption = { dose: string; slug: string; current: boolean }

/**
 * Peptide titles encode the dose inline, e.g. "BPC-157 10mg". Split a single
 * (non-blend) title into its base name and dose so products of the same peptide
 * at different strengths can be grouped. Blends (titles with "+") have no clean
 * dose and are returned with dose = null.
 */
export function splitPeptideTitle(title: string): { base: string; dose: string | null } {
  const t = title.trim()
  if (t.includes('+')) return { base: t, dose: null }
  const m = t.match(/^(.*?)[\s,]*(\d+(?:\.\d+)?\s*mg)\s*$/i)
  if (!m) return { base: t, dose: null }
  return { base: m[1].trim(), dose: m[2].replace(/\s+/g, '').toLowerCase() }
}

/** Sort doses numerically by their mg value (e.g. 5mg before 10mg before 100mg). */
function doseValue(dose: string): number {
  return parseFloat(dose) || 0
}

/**
 * Other strengths of the same peptide. Returns [] unless at least two products
 * (including the current one) share the same base name — so the selector only
 * shows when there's a real choice.
 */
export async function getDoseSiblings(
  supabase: SupabaseClient,
  product: { slug: string; title: string; category_id: string },
): Promise<DoseOption[]> {
  const { base, dose } = splitPeptideTitle(product.title)
  if (!dose) return []

  const { data } = await supabase
    .from('products')
    .select('slug, title')
    .eq('category_id', product.category_id)
    .eq('is_active', true)

  const siblings: DoseOption[] = []
  for (const p of data ?? []) {
    const split = splitPeptideTitle(String(p.title))
    if (split.dose && split.base.toLowerCase() === base.toLowerCase()) {
      siblings.push({ dose: split.dose, slug: p.slug, current: p.slug === product.slug })
    }
  }
  if (siblings.length < 2) return []
  return siblings.sort((a, b) => doseValue(a.dose) - doseValue(b.dose))
}
