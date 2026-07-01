import Link from 'next/link'
import type { HomeBrand } from '@/lib/home-brands'

function BrandCard({ brand }: { brand: HomeBrand }) {
  return (
    <Link
      href={brand.href}
      className="flex w-[180px] shrink-0 flex-col items-center rounded-2xl border border-gray-100 bg-white px-4 py-5 shadow-sm transition hover:border-[#ec6a82]/40 hover:shadow-md"
      aria-label={`${brand.name} — ${brand.count} products`}
    >
      <span className="text-lg font-bold tracking-tight text-[#ec6a82]">{brand.name}</span>
      <span className="mt-2 text-[11px] leading-snug text-gray-500">
        <span className="font-semibold text-[#ec6a82]">{brand.count}</span>{' '}
        {brand.count === 1 ? 'product' : 'products'}
      </span>
    </Link>
  )
}

/** Seamless auto-scrolling band of brand cards (pauses on hover). */
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
