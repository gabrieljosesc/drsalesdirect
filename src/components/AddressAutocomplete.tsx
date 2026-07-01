'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { parseGooglePlace, type ParsedAddress } from '@/lib/parse-google-place'

const API_KEY = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim()
const MIN_CHARS = 3
const DEBOUNCE_MS = 300

type Status = 'loading' | 'ready' | 'error' | 'no-key'

type Suggestion = { placeId: string; description: string }

interface Props {
  name: string
  value: string
  onChange: (value: string) => void
  onAddressSelect: (address: ParsedAddress) => void
  placeholder?: string
  hasError?: boolean
}

let mapsPromise: Promise<void> | null = null

function loadGoogleMaps(key: string): Promise<void> {
  if (mapsPromise) return mapsPromise
  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    mapsPromise = Promise.resolve()
    return mapsPromise
  }
  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
  return mapsPromise
}

function placesOk(status: string): boolean {
  return status === 'OK' || status === window.google?.maps?.places?.PlacesServiceStatus?.OK
}

export function AddressAutocomplete({
  name, value, onChange, onAddressSelect, placeholder, hasError,
}: Props) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const servicesRef = useRef<{
    autocomplete: google.maps.places.AutocompleteService
    places: google.maps.places.PlacesService
  } | null>(null)
  const lastExternal = useRef(value)
  const statusRef = useRef<Status>(API_KEY ? 'loading' : 'no-key')

  const [query, setQuery] = useState(value)
  const queryRef = useRef(query)
  queryRef.current = query
  const [status, setStatus] = useState<Status>(statusRef.current)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  statusRef.current = status

  // Sync when parent resets value
  useEffect(() => {
    if (value !== lastExternal.current) {
      lastExternal.current = value
      setQuery(value)
      setSuggestions([])
      setOpen(false)
    }
  }, [value])

  // Load Google Maps
  useEffect(() => {
    if (!API_KEY) { setStatus('no-key'); return }
    let cancelled = false
    loadGoogleMaps(API_KEY)
      .then(() => {
        if (cancelled || !window.google?.maps?.places) { if (!cancelled) setStatus('error'); return }
        const mount = document.createElement('div')
        servicesRef.current = {
          autocomplete: new window.google.maps.places.AutocompleteService(),
          places: new window.google.maps.places.PlacesService(mount),
        }
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true; servicesRef.current = null }
  }, [])

  const fetchSuggestions = useCallback((input: string) => {
    const services = servicesRef.current
    if (!services || input.trim().length < MIN_CHARS) {
      setSuggestions([]); setOpen(false); return
    }
    services.autocomplete.getPlacePredictions(
      { input: input.trim() },
      (predictions, predictionStatus) => {
        if (!placesOk(predictionStatus as string) || !predictions?.length) {
          setSuggestions([]); setOpen(false); return
        }
        setSuggestions(predictions.map(p => ({ placeId: p.place_id, description: p.description })))
        setOpen(true)
        setActiveIndex(-1)
      }
    )
  }, [])

  // If user typed before Maps loaded
  useEffect(() => {
    if (status === 'ready' && queryRef.current.trim().length >= MIN_CHARS) {
      fetchSuggestions(queryRef.current)
    }
  }, [status, fetchSuggestions])

  const scheduleFetch = useCallback((input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (statusRef.current !== 'ready') return
    debounceRef.current = setTimeout(() => fetchSuggestions(input), DEBOUNCE_MS)
  }, [fetchSuggestions])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  function selectSuggestion(s: Suggestion) {
    const services = servicesRef.current
    if (!services) return
    setOpen(false); setSuggestions([])
    setQuery(s.description); lastExternal.current = s.description; onChange(s.description)

    services.places.getDetails(
      { placeId: s.placeId, fields: ['address_components', 'formatted_address'] },
      (place, detailStatus) => {
        if (!placesOk(detailStatus as string) || !place) return
        const parsed = parseGooglePlace(place)
        if (!parsed) return
        setQuery(parsed.line1); lastExternal.current = parsed.line1; onChange(parsed.line1)
        onAddressSelect(parsed)
      }
    )
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => (i + 1) % suggestions.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => i <= 0 ? suggestions.length - 1 : i - 1) }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); selectSuggestion(suggestions[activeIndex]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  const baseClass = `w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82] ${
    hasError ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-input bg-white'
  }`

  // No API key — plain text input
  if (status === 'no-key') {
    return (
      <input
        name={name} type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value) }}
        placeholder={placeholder}
        autoComplete="street-address"
        className={baseClass}
      />
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        name={name} type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); scheduleFetch(e.target.value) }}
        onFocus={() => { if (suggestions.length) setOpen(true) }}
        onBlur={() => { const v = inputRef.current?.value ?? query; lastExternal.current = v; onChange(v); window.setTimeout(() => setOpen(false), 150) }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Street address, suite, unit…'}
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        data-lpignore="true"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        className={baseClass}
      />

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={s.placeId} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                tabIndex={-1}
                className={`w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-blue-50 ${i === activeIndex ? 'bg-blue-50' : ''}`}
                onMouseDown={e => { e.preventDefault(); selectSuggestion(s) }}
              >
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      )}

      {status === 'loading' && (
        <p className="mt-1 text-xs text-gray-400">Loading address suggestions…</p>
      )}
    </div>
  )
}
