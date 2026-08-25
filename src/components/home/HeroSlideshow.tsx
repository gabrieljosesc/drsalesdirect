'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Award, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

type Slide = {
  eyebrow: string
  title: string
  body: string
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
  bullets: string[]
  gradient: string
  /** Optional background photo at /public/hero/<file>. Falls back to the gradient. */
  image?: string
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Trusted by Medical Professionals Since 2012',
    title: 'Premium Medical Supplies at Wholesale Prices',
    body: 'Your trusted source for rheumatology, ophthalmology, orthopedic injectables, aesthetic products, and more — offering a comprehensive selection at competitive wholesale prices, delivered directly to your practice.',
    primary: { label: 'Shop All Products', href: '/shop' },
    secondary: { label: 'Create Account', href: '/auth/register' },
    bullets: ['Authentic & guaranteed', 'Cold-chain shipping', 'Licensed pros only'],
    gradient: 'from-[#2a4581]/90 via-[#4f64a8]/70 to-[#ec6a82]/55',
    image: '/hero/hero-1.jpg',
  },
  {
    eyebrow: 'Authentic Injectables, Cold-Chain Guaranteed',
    title: 'Dermal Fillers & Botulinum Toxins, In Stock',
    body: 'Allergan, Galderma, Merz, Teoxane, Vivacy and more — genuine product, validated cold-chain packaging, and a team that confirms every order personally.',
    primary: { label: 'Browse Injectables', href: '/shop/dermal-fillers' },
    secondary: { label: 'Botulinum Toxins', href: '/shop/botulinum-toxins' },
    bullets: ['Original manufacturers', 'Validated cold-chain', 'Wholesale pricing'],
    gradient: 'from-[#264079]/90 via-[#5063a6]/70 to-[#e8657f]/55',
    image: '/hero/hero-2.jpg',
  },
  {
    eyebrow: 'Wholesale Pricing — Buy More, Save More',
    title: 'Bulk Discounts on Every Order',
    body: 'Automatic quantity-based pricing across our catalog — the more units you order, the lower your price per unit, shown right on each product page.',
    primary: { label: 'Shop All Products', href: '/shop' },
    secondary: { label: 'Best Sellers', href: '/shop' },
    bullets: ['Tiered volume pricing', 'Dedicated account manager', 'Fast, tracked shipping'],
    gradient: 'from-[#2c4a8c]/90 via-[#5a6cb4]/65 to-[#f08aa0]/55',
  },
]

const INTERVAL = 3000

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState<Record<string, boolean>>({})

  const go = useCallback((next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), INTERVAL)
    return () => clearInterval(t)
  }, [paused])

  const slide = SLIDES[index]

  return (
    <section
      className="relative overflow-hidden bg-[#ec6a82] bg-cover bg-center"
      style={{ backgroundImage: 'url(/hero-bg.svg)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* Optional per-slide background photo (drop files in /public/hero) */}
      {SLIDES.map((s) =>
        s.image && !failed[s.image] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.image}
            src={s.image}
            alt=""
            aria-hidden="true"
            onError={() => setFailed(f => ({ ...f, [s.image!]: true }))}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
              SLIDES[index].image === s.image ? 'opacity-100' : 'opacity-0'
            )}
          />
        ) : null
      )}
      <div className={cn('absolute inset-0 bg-gradient-to-r transition-colors duration-700', slide.gradient)} />

      {/* Compact vertical rhythm: the hero plus the top of the promo cards must
          fit above the fold on ~720px-tall laptop viewports. */}
      <div className="relative max-w-7xl mx-auto px-4 pt-10 pb-20 lg:pt-14 lg:pb-24">
        <div key={index} className="pmw-slide-enter max-w-2xl text-white">
          <p className="inline-flex items-center gap-2 text-blue-200 text-xs font-semibold tracking-widest uppercase mb-3 bg-white/10 rounded-full px-3 py-1">
            <Award className="w-3.5 h-3.5" /> {slide.eyebrow}
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.08] mb-4">
            {slide.title}
          </h1>
          <p className="text-white/85 text-base md:text-lg mb-6 max-w-xl">{slide.body}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={slide.primary.href} className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-[#ec6a82] hover:bg-gray-100 font-semibold gap-2')}>
              {slide.primary.label} <ArrowRight className="w-4 h-4" />
            </Link>
            {slide.secondary && (
              <Link href={slide.secondary.href} className={cn(buttonVariants({ size: 'lg' }), 'bg-transparent border border-white text-white hover:bg-white hover:text-[#ec6a82] font-semibold')}>
                {slide.secondary.label}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm text-white/75">
            {slide.bullets.map(b => (
              <span key={b} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-300" /> {b}
              </span>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="relative mt-6 flex items-center gap-3">
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === index ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                )}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="size-9 rounded-full border border-white/30 text-white/80 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="size-9 rounded-full border border-white/30 text-white/80 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
