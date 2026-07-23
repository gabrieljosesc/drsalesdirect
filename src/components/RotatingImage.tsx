'use client'

import { useEffect, useState } from 'react'

/**
 * Cross-fades between a set of images on a timer. Falls back to `fallback`
 * when there are no images, or once every image has failed to load.
 *
 * `delayMs` staggers the start so a grid of cards doesn't flip in lockstep.
 */
export default function RotatingImage({
  images,
  alt = '',
  intervalMs = 5000,
  delayMs = 0,
  imgClassName = '',
  fallback = null,
}: {
  images: string[]
  alt?: string
  intervalMs?: number
  delayMs?: number
  imgClassName?: string
  fallback?: React.ReactNode
}) {
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState<Record<string, boolean>>({})

  const usable = images.filter(src => !failed[src])

  useEffect(() => {
    if (usable.length < 2) return
    let interval: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      setIndex(i => (i + 1) % usable.length)
      interval = setInterval(() => setIndex(i => (i + 1) % usable.length), intervalMs)
    }, delayMs + intervalMs)
    return () => {
      clearTimeout(start)
      if (interval) clearInterval(interval)
    }
  }, [usable.length, intervalMs, delayMs])

  if (usable.length === 0) return <>{fallback}</>

  const active = index % usable.length

  return (
    <>
      {usable.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={i === active ? alt : ''}
          aria-hidden={i !== active}
          loading={i === 0 ? 'eager' : 'lazy'}
          onError={() => setFailed(f => ({ ...f, [src]: true }))}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            i === active ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      ))}
    </>
  )
}
