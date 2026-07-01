'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Slim top-of-page progress bar shown during internal navigations. It starts on
 * any same-origin link click and settles once the new route's pathname/search
 * resolves. Purely cosmetic — makes navigation feel faster.
 */
export default function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
    setActive(true)
  }, [])

  // Settle shortly after the route actually changes
  useEffect(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => setActive(false), 200)
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [pathname, searchParams])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = (event.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return

      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return

      const next = url.pathname + url.search
      const current = window.location.pathname + window.location.search
      if (next === current) return

      start()
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [start])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden"
      aria-hidden={!active}
    >
      <div
        className={`h-full bg-gradient-to-r from-[#ec6a82] via-[#2a5a8c] to-[#ec6a82] transition-all duration-300 ${
          active ? 'w-full opacity-100' : 'w-0 opacity-0'
        }`}
      />
    </div>
  )
}
