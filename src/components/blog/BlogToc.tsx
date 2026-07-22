'use client'

import { useEffect, useState } from 'react'
import { List } from 'lucide-react'
import type { TocEntry } from '@/lib/blog-html'

export default function BlogToc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (entries.length === 0) return
    const observer = new IntersectionObserver(
      (obs) => {
        const visible = obs.filter(o => o.isIntersecting)
        if (visible.length > 0) {
          setActive(visible[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    )
    entries.forEach(e => {
      const el = document.getElementById(e.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [entries])

  function onClick(e: React.MouseEvent, id: string) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 90
      window.scrollTo({ top: y, behavior: 'smooth' })
      history.replaceState(null, '', `#${id}`)
    }
  }

  if (entries.length < 2) return null

  return (
    <nav aria-label="Table of contents" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <List className="h-4 w-4 text-[#ec6a82]" /> On this page
      </p>
      <ul className="space-y-1 text-sm">
        {entries.map((e) => (
          <li key={e.id} className={e.level === 3 ? 'pl-3' : ''}>
            <a
              href={`#${e.id}`}
              onClick={(ev) => onClick(ev, e.id)}
              className={`block rounded-md px-2 py-1 transition-colors ${
                active === e.id
                  ? 'bg-rose-50 font-medium text-[#ec6a82]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#ec6a82]'
              }`}
            >
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
