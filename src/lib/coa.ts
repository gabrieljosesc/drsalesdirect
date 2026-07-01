import coaManifest from '@/data/coa-manifest.json'
import type { ProductCoa } from '@/types'

type ManifestEntry = ProductCoa[] | string

/** COA links from manifest or legacy single DB column. */
export function getProductCoas(slug: string, coaUrl?: string | null): ProductCoa[] {
  const entry = (coaManifest as Record<string, ManifestEntry>)[slug]

  if (Array.isArray(entry) && entry.length > 0) return entry
  if (typeof entry === 'string') return [{ label: 'Certificate of Analysis', url: entry }]
  if (coaUrl) return [{ label: 'Certificate of Analysis', url: coaUrl }]
  return []
}
