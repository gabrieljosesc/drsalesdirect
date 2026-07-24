'use client'

import Link from 'next/link'
import { Truck, Tag, ShieldCheck, Headset, Sparkles } from 'lucide-react'

type Announcement = { icon: typeof Truck; text: string; href?: string }

/** Edit this list to change what scrolls in the announcement bar. */
const ANNOUNCEMENTS: Announcement[] = [
  { icon: Truck, text: 'Free shipping on your first order — and every order over $795', href: '/shipping' },
  { icon: Tag, text: 'Bulk pricing: the more units you order, the lower your price per unit', href: '/shop' },
  { icon: ShieldCheck, text: 'Authentic products sourced from original manufacturers', href: '/about' },
  { icon: Sparkles, text: 'New: research peptides now in stock', href: '/peptides' },
  { icon: Headset, text: 'Questions? Call +1-855-843-4782, Mon – Fri 9:00 AM – 6:00 PM EST', href: '/contact' },
]

function Item({ a }: { a: Announcement }) {
  const Icon = a.icon
  const body = (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 flex-shrink-0 opacity-80" />
      {a.text}
    </span>
  )
  return (
    <span className="mx-6 inline-flex items-center">
      {a.href ? (
        <Link href={a.href} className="transition-opacity hover:opacity-100 opacity-90">{body}</Link>
      ) : (
        <span className="opacity-90">{body}</span>
      )}
      <span aria-hidden className="ml-6 text-white/30">•</span>
    </span>
  )
}

/**
 * Scrolling announcement / news ticker. The track is duplicated so the loop is
 * seamless; it pauses on hover and stops entirely for reduced-motion users.
 */
export default function AnnouncementBar() {
  return (
    <div className="dsd-ticker-wrap relative overflow-hidden bg-[#b83a52] text-white">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#b83a52] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#b83a52] to-transparent" />

      <div className="dsd-ticker-track flex w-max py-1.5 text-xs font-normal tracking-wide">
        <div className="flex shrink-0">
          {ANNOUNCEMENTS.map((a, i) => <Item key={i} a={a} />)}
        </div>
        <div className="flex shrink-0" aria-hidden>
          {ANNOUNCEMENTS.map((a, i) => <Item key={`dup-${i}`} a={a} />)}
        </div>
      </div>
    </div>
  )
}
