'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Syringe, Zap, Sparkles, Scale, Droplet, Layers, Bone, Ruler, ArrowRight, LucideIcon } from 'lucide-react'

type Cat = { slug: string; name: string; icon: LucideIcon; gradient: string; iconColor: string }

// The 8 headline categories shown on the homepage. Drop a photo at
// /public/categories/<slug>.jpg and it replaces the gradient automatically.
const FEATURED: Cat[] = [
  { slug: 'dermal-fillers', name: 'Dermal Fillers', icon: Syringe, gradient: 'from-rose-100 to-rose-50', iconColor: 'text-rose-500' },
  { slug: 'botulinum-toxins', name: 'Botulinum Toxins', icon: Zap, gradient: 'from-sky-100 to-sky-50', iconColor: 'text-sky-500' },
  { slug: 'skincare', name: 'Skincare', icon: Sparkles, gradient: 'from-amber-100 to-amber-50', iconColor: 'text-amber-500' },
  { slug: 'weight-loss', name: 'Weight Loss', icon: Scale, gradient: 'from-emerald-100 to-emerald-50', iconColor: 'text-emerald-500' },
  { slug: 'peels-and-masks', name: 'Peels & Masks', icon: Droplet, gradient: 'from-violet-100 to-violet-50', iconColor: 'text-violet-500' },
  { slug: 'threads', name: 'Thread Lifts', icon: Layers, gradient: 'from-fuchsia-100 to-fuchsia-50', iconColor: 'text-fuchsia-500' },
  { slug: 'orthopedic-injections', name: 'Orthopedic Injections', icon: Bone, gradient: 'from-blue-100 to-blue-50', iconColor: 'text-blue-500' },
  { slug: 'cannulas-and-needles', name: 'Cannulas & Needles', icon: Ruler, gradient: 'from-teal-100 to-teal-50', iconColor: 'text-teal-500' },
]

function CategoryCard({ cat }: { cat: Cat }) {
  const [imgOk, setImgOk] = useState(true)
  const Icon = cat.icon
  return (
    <Link
      href={`/shop/${cat.slug}`}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-[#ec6a82]/40 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* Photo (if present) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/categories/${cat.slug}.jpg`}
          alt={cat.name}
          onError={() => setImgOk(false)}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${imgOk ? '' : 'hidden'}`}
        />
        {/* Gradient + icon fallback */}
        {!imgOk && (
          <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${cat.gradient}`}>
            <Icon className={`h-12 w-12 ${cat.iconColor} opacity-80`} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-3.5">
        <span className="text-sm font-semibold text-gray-800 group-hover:text-[#ec6a82]">{cat.name}</span>
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-[#ec6a82]" />
      </div>
    </Link>
  )
}

export default function FeaturedCategories() {
  return (
    <section className="bg-gray-50 border-y">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Shop by Category</h2>
          <p className="mt-2 text-gray-500">Everything you need to run your practice, in one place.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {FEATURED.map((cat) => (
            <CategoryCard key={cat.slug} cat={cat} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-[#ec6a82] hover:text-[#ec6a82]"
          >
            View All Categories <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
