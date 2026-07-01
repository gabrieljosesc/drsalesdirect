'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Sparkles, Truck, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type Highlight = {
  tag: string
  title: string
  body: string
  cta: { label: string; href: string }
  icon: typeof Sparkles
  theme: string
  accent: string
}

const HIGHLIGHTS: Highlight[] = [
  {
    tag: 'New This Month',
    title: 'Research Peptides — Now In Stock',
    body: 'A growing high-purity catalog, each with a third-party certificate of analysis on the product page.',
    cta: { label: 'Explore Peptides', href: '/peptides' },
    icon: Sparkles,
    theme: 'from-[#ec6a82] to-[#2a5a8c]',
    accent: 'text-blue-200',
  },
  {
    tag: 'Member Perk',
    title: 'Your First Order Ships Free',
    body: 'Free shipping on your first order — then free over $795, $50 over $498, $100 under. Always shown at checkout.',
    cta: { label: 'Start Shopping', href: '/shop' },
    icon: Truck,
    theme: 'from-[#2d5f5f] to-[#3d7a7a]',
    accent: 'text-teal-100',
  },
  {
    tag: 'Why Dr Sales Direct',
    title: 'Authentic Product, Cold-Chain Guaranteed',
    body: 'Sourced from original manufacturers and shipped in validated insulated packaging to protect temperature-sensitive items.',
    cta: { label: 'Our Shipping Promise', href: '/legal/shipping-cold-chain' },
    icon: ShieldCheck,
    theme: 'from-[#7a2d3a] to-[#c92d3a]',
    accent: 'text-rose-100',
  },
]

const INTERVAL = 7000

export default function HighlightSlides() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setIndex(i => (i + 1) % HIGHLIGHTS.length), INTERVAL)
    return () => clearInterval(t)
  }, [paused])

  const h = HIGHLIGHTS[index]
  const Icon = h.icon

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div
        className={cn('relative overflow-hidden rounded-3xl bg-gradient-to-br text-white p-8 lg:p-12', h.theme)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div key={index} className="pmw-slide-enter relative z-10 max-w-2xl">
          <p className={cn('inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-4 bg-white/10 rounded-full px-3 py-1', h.accent)}>
            <Icon className="w-3.5 h-3.5" /> {h.tag}
          </p>
          <h2 className="text-2xl lg:text-4xl font-bold leading-tight mb-3">{h.title}</h2>
          <p className="text-white/85 mb-6 max-w-xl">{h.body}</p>
          <Link
            href={h.cta.href}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
          >
            {h.cta.label} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* decorative icon */}
        <Icon className="pointer-events-none absolute -right-6 -bottom-6 w-44 h-44 text-white/10" />

        {/* dots */}
        <div className="relative z-10 mt-8 flex gap-2">
          {HIGHLIGHTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Highlight ${i + 1}`}
              aria-current={i === index}
              className={cn('h-2 rounded-full transition-all', i === index ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70')}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
