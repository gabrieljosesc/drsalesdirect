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
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Trusted by Medical Professionals Since 2012',
    title: 'Premium Medical Supplies at Wholesale Prices',
    body: 'Botulinum toxins, dermal fillers, orthopedic injectables, and rheumatology — sourced from original manufacturers and delivered straight to your clinic.',
    primary: { label: 'Shop All Products', href: '/shop' },
    secondary: { label: 'Create Account', href: '/auth/register' },
    bullets: ['Authentic & guaranteed', 'Cold-chain shipping', 'Licensed pros only'],
    gradient: 'from-[#2a4581]/90 via-[#4f64a8]/70 to-[#ec6a82]/55',
  },
  {
    eyebrow: 'Authentic Injectables, Cold-Chain Guaranteed',
    title: 'Dermal Fillers & Botulinum Toxins, In Stock',
    body: 'Allergan, Galderma, Merz, Teoxane, Vivacy and more — genuine product, validated cold-chain packaging, and a team that confirms every order personally.',
    primary: { label: 'Browse Injectables', href: '/shop/dermal-fillers' },
    secondary: { label: 'Botulinum Toxins', href: '/shop/botulinum-toxins' },
    bullets: ['Original manufacturers', 'Validated cold-chain', 'Wholesale pricing'],
    gradient: 'from-[#264079]/90 via-[#5063a6]/70 to-[#e8657f]/55',
  },
  {
    eyebrow: 'New — Research Peptides',
    title: 'Now Stocking Premium Research Peptides',
    body: 'A growing catalog of high-purity peptides with third-party certificates of analysis available on every product.',
    primary: { label: 'Explore Peptides', href: '/peptides' },
    secondary: { label: 'View Certificates', href: '/peptides' },
    bullets: ['Third-party tested', 'COA on every product', 'Fast, tracked shipping'],
    gradient: 'from-[#2c4a8c]/90 via-[#5a6cb4]/65 to-[#f08aa0]/55',
  },
]

const INTERVAL = 6500

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

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
      <div className={cn('absolute inset-0 bg-gradient-to-r transition-colors duration-700', slide.gradient)} />

      <div className="relative max-w-7xl mx-auto px-4 py-20 lg:py-28">
        <div key={index} className="pmw-slide-enter max-w-2xl text-white">
          <p className="inline-flex items-center gap-2 text-blue-200 text-xs font-semibold tracking-widest uppercase mb-4 bg-white/10 rounded-full px-3 py-1">
            <Award className="w-3.5 h-3.5" /> {slide.eyebrow}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] mb-5">
            {slide.title}
          </h1>
          <p className="text-white/85 text-lg mb-8 max-w-xl">{slide.body}</p>
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
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-sm text-white/75">
            {slide.bullets.map(b => (
              <span key={b} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-300" /> {b}
              </span>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="relative mt-10 flex items-center gap-3">
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
