import Link from 'next/link'
import type { HomeBrand } from '@/lib/home-brands'

// Styled wordmarks: each manufacturer rendered with distinctive typography and
// its brand colour, so the band reads like a real brand wall (rather than one
// uniform font) — without embedding any manufacturer's copyrighted logo file.
type WordmarkStyle = { className: string; color: string; label?: string }
const BRAND_STYLE: Record<string, WordmarkStyle> = {
  Allergan:  { className: 'font-serif font-bold tracking-tight', color: '#0b2f6b' },
  Galderma:  { className: 'font-sans font-semibold tracking-tight', color: '#1d1d1b' },
  Merz:      { className: 'font-sans font-extrabold uppercase tracking-wide', color: '#00a0af' },
  Teoxane:   { className: 'font-serif italic tracking-tight', color: '#9c7a35' },
  Vivacy:    { className: 'font-sans font-light uppercase tracking-[0.2em]', color: '#6d3b8e' },
  Fillmed:   { className: 'font-sans font-semibold uppercase tracking-[0.18em]', color: '#111827' },
  Neauvia:   { className: 'font-serif font-medium tracking-wide', color: '#1f2937' },
  Intraline: { className: 'font-sans font-bold tracking-tight', color: '#0f766e' },
  IBSA:      { className: 'font-sans font-extrabold tracking-tight', color: '#0066b3' },
  Sinclair:  { className: 'font-serif font-semibold tracking-tight', color: '#2e2e2e' },
  Croma:     { className: 'font-sans font-bold uppercase tracking-widest', color: '#e2001a' },
}
const DEFAULT_STYLE: WordmarkStyle = { className: 'font-sans font-bold tracking-tight', color: '#1f2937' }

function BrandCard({ brand }: { brand: HomeBrand }) {
  const style = BRAND_STYLE[brand.name] ?? DEFAULT_STYLE
  return (
    <Link
      href={brand.href}
      className="flex h-[104px] w-[190px] shrink-0 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-4 shadow-sm transition hover:border-[#ec6a82]/40 hover:shadow-md"
      aria-label={`${brand.name} — ${brand.count} products`}
    >
      <span className={`text-xl leading-none ${style.className}`} style={{ color: style.color }}>
        {style.label ?? brand.name}
      </span>
      <span className="mt-2.5 text-[11px] leading-snug text-gray-400">
        <span className="font-semibold text-gray-600">{brand.count}</span>{' '}
        {brand.count === 1 ? 'product' : 'products'}
      </span>
    </Link>
  )
}

/** Seamless auto-scrolling band of brand wordmarks (pauses on hover). */
export default function BrandMarquee({ brands }: { brands: HomeBrand[] }) {
  if (brands.length === 0) return null

  return (
    <section className="border-y bg-gradient-to-b from-gray-50 to-white py-10" aria-label="Brands we carry">
      <div className="text-center mb-6 px-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Trusted Brands We Carry</h2>
      </div>
      <div className="pmw-marquee-wrap relative overflow-hidden">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-gray-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />
        <div className="pmw-marquee-track flex w-max gap-4">
          <div className="flex shrink-0 gap-4 pr-4">
            {brands.map(b => <BrandCard key={b.name} brand={b} />)}
          </div>
          <div className="flex shrink-0 gap-4 pr-4" aria-hidden>
            {brands.map(b => <BrandCard key={`dup-${b.name}`} brand={b} />)}
          </div>
        </div>
      </div>
    </section>
  )
}
