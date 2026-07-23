'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import RotatingImage from '@/components/RotatingImage'
import { categoryImages } from '@/lib/category-images'

/**
 * Category page hero banner. Cross-fades the category's photos from
 * /public/categories/<slug>-<n>.jpg, or falls back to a branded gradient.
 * Overlays breadcrumb, title, description, count.
 */
export default function CategoryBanner({
  slug, name, description, count,
}: {
  slug: string
  name: string
  description?: string | null
  count: number
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1f3a6b] via-[#3a4a7e] to-[#ec6a82]">
      <RotatingImage images={categoryImages(slug)} alt={name} intervalMs={6000} />
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/55 to-gray-900/25" />

      <div className="relative px-6 py-10 md:px-10 md:py-14">
        <nav className="flex items-center gap-1.5 text-sm text-white/80">
          <Link href="/" className="hover:text-white">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/shop" className="hover:text-white">Shop</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-white">{name}</span>
        </nav>
        <h1 className="mt-4 text-3xl md:text-4xl font-bold text-white">{name}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm md:text-base text-white/85">{description}</p>}
        <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {count} {count === 1 ? 'product' : 'products'}
        </p>
      </div>
    </div>
  )
}
