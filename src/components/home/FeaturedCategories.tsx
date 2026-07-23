'use client'

import Link from 'next/link'
import { Syringe, Eye, Sparkles, Scale, FlaskConical, Bone, Bone as BoneIcon, Stethoscope, ArrowRight, LucideIcon } from 'lucide-react'
import RotatingImage from '@/components/RotatingImage'
import { categoryImages } from '@/lib/category-images'

type Cat = { slug: string; name: string; icon: LucideIcon; gradient: string; iconColor: string }

// The 8 headline categories shown on the homepage. Photos come from
// /public/categories/<slug>-<n>.jpg (see lib/category-images) and cross-fade
// when a category has more than one; otherwise a gradient + icon is shown.
const FEATURED: Cat[] = [
  { slug: 'rheumatology', name: 'Rheumatology', icon: Stethoscope, gradient: 'from-sky-100 to-sky-50', iconColor: 'text-sky-500' },
  { slug: 'ophthalmology', name: 'Ophthalmology', icon: Eye, gradient: 'from-blue-100 to-blue-50', iconColor: 'text-blue-500' },
  { slug: 'orthopedic-injections', name: 'Orthopedic Injections', icon: Bone, gradient: 'from-indigo-100 to-indigo-50', iconColor: 'text-indigo-500' },
  { slug: 'osteoporosis', name: 'Osteoporosis', icon: BoneIcon, gradient: 'from-teal-100 to-teal-50', iconColor: 'text-teal-500' },
  { slug: 'gynecology', name: 'Gynecology', icon: Sparkles, gradient: 'from-pink-100 to-pink-50', iconColor: 'text-pink-500' },
  { slug: 'peptides', name: 'Peptides', icon: FlaskConical, gradient: 'from-violet-100 to-violet-50', iconColor: 'text-violet-500' },
  { slug: 'dermal-fillers', name: 'Dermal Fillers', icon: Syringe, gradient: 'from-rose-100 to-rose-50', iconColor: 'text-rose-500' },
  { slug: 'weight-loss', name: 'Weight Loss', icon: Scale, gradient: 'from-emerald-100 to-emerald-50', iconColor: 'text-emerald-500' },
]

function CategoryCard({ cat, index }: { cat: Cat; index: number }) {
  const Icon = cat.icon
  return (
    <Link
      href={`/shop/${cat.slug}`}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-[#ec6a82]/40 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <RotatingImage
          images={categoryImages(cat.slug)}
          alt={cat.name}
          delayMs={index * 700}
          imgClassName="transition-transform duration-500 group-hover:scale-105"
          fallback={
            <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${cat.gradient}`}>
              <Icon className={`h-12 w-12 ${cat.iconColor} opacity-80`} strokeWidth={1.5} />
            </div>
          }
        />
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
          {FEATURED.map((cat, i) => (
            <CategoryCard key={cat.slug} cat={cat} index={i} />
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
