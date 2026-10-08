import Image from 'next/image'
import type { Metadata } from 'next'
import { ArrowRight, BadgeCheck, Truck, HeadphonesIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Explore Our Products',
  description: 'Choose a category to explore products and pricing at Dr Sales Direct.',
  // Campaign landing page: keep it out of search results so Lucky Orange /
  // GA4 numbers reflect fax traffic only.
  robots: { index: false, follow: true },
}

/**
 * Fax-campaign landing page (recreates the client's Canva design natively).
 * The QR code on the fax brings clinics here; each category card carries the
 * client's exact UTM parameters so Lucky Orange / GA4 attribute the click to
 * the campaign and category.
 *
 * Plain <a> tags (not <Link>) force a full navigation, so the UTM query
 * string registers as a classic pageview in every tracker.
 */
const UTM = 'utm_source=fax&utm_medium=qr&utm_campaign=all_categories_fax_2026'

const CATEGORIES: { name: string; slug: string; content: string; tint: string; ring: string }[] = [
  { name: 'Orthopedic',    slug: 'orthopedic-injections', content: 'orthopedic',   tint: 'bg-blue-50',   ring: 'border-blue-200 hover:border-blue-300' },
  { name: 'Rheumatology',  slug: 'rheumatology',          content: 'rheumatology', tint: 'bg-pink-50',   ring: 'border-pink-200 hover:border-pink-300' },
  { name: 'Dermatology',   slug: 'dermatology',           content: 'dermatology',  tint: 'bg-orange-50', ring: 'border-orange-200 hover:border-orange-300' },
  { name: 'Ophthalmology', slug: 'ophthalmology',         content: 'ophthalmology',tint: 'bg-purple-50', ring: 'border-purple-200 hover:border-purple-300' },
  { name: 'Peptides',      slug: 'peptides',              content: 'peptides',     tint: 'bg-green-50',  ring: 'border-green-200 hover:border-green-300' },
  { name: 'Gynecology',    slug: 'gynecology',            content: 'gynecology',   tint: 'bg-rose-50',   ring: 'border-rose-200 hover:border-rose-300' },
  { name: 'Weight Loss',   slug: 'weight-loss',           content: 'weight_loss',  tint: 'bg-sky-50',    ring: 'border-sky-200 hover:border-sky-300' },
]

const PERKS = [
  { icon: BadgeCheck, text: 'Authentic products from original manufacturers' },
  { icon: Truck, text: 'Free shipping on your first order' },
  { icon: HeadphonesIcon, text: 'Toll-free support: +1-855-843-4782' },
]

function CategoryCard({ cat }: { cat: (typeof CATEGORIES)[number] }) {
  return (
    <a
      href={`/shop/${cat.slug}?${UTM}&utm_content=${cat.content}`}
      className={`group flex w-[46%] max-w-[250px] flex-col rounded-2xl border ${cat.tint} ${cat.ring} p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-[30%] lg:w-[22%]`}
    >
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800 sm:text-base">
        {cat.name}
      </h2>
      <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-xl bg-white">
        <Image
          src={`/categories/${cat.slug}-1.jpg`}
          alt={cat.name}
          fill
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 250px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <span className="mt-auto inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-700 group-hover:text-[#ec6a82]">
        Explore Products <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </a>
  )
}

export default function FaxLandingPage() {
  return (
    <div className="bg-gradient-to-b from-white via-[#f3f7fc] to-[#eef3fa]">
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-4 text-center md:pt-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
          EXPLORE OUR PRODUCTS
        </h1>
        <p className="mt-3 text-base text-gray-600 md:text-lg">
          Choose a category to explore products and pricing.
        </p>
      </section>

      {/* 4 cards, then 3 centered underneath on desktop; wraps naturally on mobile */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap justify-center gap-4 md:gap-5">
          {CATEGORIES.map(cat => <CategoryCard key={cat.slug} cat={cat} />)}
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-t bg-white/70">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 text-center sm:grid-cols-3 sm:text-left">
          {PERKS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center justify-center gap-3 sm:justify-start">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#ec6a82]/10">
                <Icon className="h-5 w-5 text-[#ec6a82]" />
              </span>
              <p className="text-sm text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
