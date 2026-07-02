'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export type CarouselProduct = {
  id: string
  slug: string
  title: string
  base_price: number
  image: string | null
}

export default function FeaturedCarousel({ products }: { products: CarouselProduct[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  const updateArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows])

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' })
  }

  if (products.length === 0) return null

  return (
    <div className="relative">
      {/* Arrows */}
      {canLeft && (
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className="absolute -left-3 top-[38%] z-10 flex size-10 items-center justify-center rounded-full border bg-white shadow-md text-gray-600 hover:text-[#ec6a82] hover:border-[#ec6a82] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canRight && (
        <button
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className="absolute -right-3 top-[38%] z-10 flex size-10 items-center justify-center rounded-full border bg-white shadow-md text-gray-600 hover:text-[#ec6a82] hover:border-[#ec6a82] transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map(p => (
          <Link
            key={p.id}
            href={`/product/${p.slug}`}
            className="group w-48 sm:w-56 flex-shrink-0 snap-start rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
          >
            <div className="relative aspect-square bg-white p-4">
              {p.image ? (
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                  sizes="224px"
                  unoptimized
                />
              ) : (
                <ShoppingCart className="absolute inset-0 m-auto w-8 h-8 text-gray-200" />
              )}
            </div>
            <div className="px-4 pb-4">
              <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-[#ec6a82] transition-colors">
                {p.title}
              </p>
              {p.base_price > 0 && (
                <p className="mt-1 text-sm font-medium text-[#a94d61]">{formatPrice(p.base_price)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
