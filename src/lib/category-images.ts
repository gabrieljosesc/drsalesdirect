/**
 * Category photo manifest.
 *
 * Files live in /public/categories as `<slug>-<n>.jpg` (1-indexed). When a
 * category has more than one photo they cross-fade on a timer wherever the
 * category is shown (homepage cards, category page banners).
 *
 * To add photos: drop `<slug>-<n>.jpg` in /public/categories and bump the
 * count here. Categories missing from this map fall back to a gradient.
 */
export const CATEGORY_IMAGE_COUNT: Record<string, number> = {
  'dermal-fillers': 3,
  'weight-loss': 3,
  'peptides': 3,
  'rheumatology': 3,
  'orthopedic-injections': 3,
  'gynecology': 3,
  'ophthalmology': 3,
  'osteoporosis': 3,
  'skincare': 1,
}

/** Ordered list of photo URLs for a category (empty when none exist). */
export function categoryImages(slug: string): string[] {
  const n = CATEGORY_IMAGE_COUNT[slug] ?? 0
  return Array.from({ length: n }, (_, i) => `/categories/${slug}-${i + 1}.jpg`)
}
