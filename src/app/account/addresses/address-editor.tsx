'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { createAddress, updateAddress, type ActionState } from '@/app/actions/account'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import type { ParsedAddress } from '@/lib/parse-google-place'

type Addr = {
  id: string
  label: string
  recipient_name: string
  phone: string
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
  is_default: boolean
}

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]'
const labelClass = 'font-medium text-gray-700'

export function AddressEditor({ mode, initial }: { mode: 'create' | 'edit'; initial?: Addr }) {
  const [state, action] = useActionState(mode === 'create' ? createAddress : updateAddress, {} as ActionState)
  const i = initial

  const [line1, setLine1] = useState(i?.line1 ?? '')
  const [city, setCity] = useState(i?.city ?? '')
  const [stateVal, setStateVal] = useState(i?.state ?? '')
  const [postalCode, setPostalCode] = useState(i?.postal_code ?? '')
  const [country, setCountry] = useState(i?.country ?? '')

  function handleSelect(parsed: ParsedAddress) {
    setLine1(parsed.line1)
    setCity(parsed.city)
    setStateVal(parsed.state)
    setPostalCode(parsed.postalCode)
    if (parsed.country) setCountry(parsed.country)
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{mode === 'create' ? 'Add Address' : 'Edit Address'}</h2>
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        {mode === 'edit' && i && <input type="hidden" name="id" value={i.id} />}
        <label className="block text-sm sm:col-span-2">
          <span className={labelClass}>Label (optional)</span>
          <input name="label" defaultValue={i?.label ?? ''} placeholder="Office, Warehouse…" className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Recipient name <span className="text-red-500">*</span></span>
          <input name="recipient_name" required defaultValue={i?.recipient_name ?? ''} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Phone</span>
          <input name="phone" defaultValue={i?.phone ?? ''} className={inputClass} />
        </label>
        <div className="block text-sm sm:col-span-2">
          <span className={labelClass}>Address line 1 <span className="text-red-500">*</span></span>
          <div className="mt-1">
            <AddressAutocomplete name="line1" value={line1} onChange={setLine1} onAddressSelect={handleSelect} placeholder="123 Main St" />
          </div>
        </div>
        <label className="block text-sm sm:col-span-2">
          <span className={labelClass}>Address line 2</span>
          <input name="line2" defaultValue={i?.line2 ?? ''} className={inputClass} />
        </label>
        {/* Hidden synced fields (autocomplete writes here too via controlled inputs below) */}
        <label className="block text-sm">
          <span className={labelClass}>City</span>
          <input name="city" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>State / region</span>
          <input name="state" value={stateVal} onChange={e => setStateVal(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Postal code</span>
          <input name="postal_code" value={postalCode} onChange={e => setPostalCode(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className={labelClass}>Country</span>
          <input name="country" value={country} onChange={e => setCountry(e.target.value)} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="is_default" defaultChecked={i?.is_default ?? false} className="h-4 w-4 rounded border-gray-300 accent-[#ec6a82]" />
          <span>Set as default address</span>
        </label>
        {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button type="submit" className="rounded-md bg-[#ec6a82] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#d95672]">
            {mode === 'create' ? 'Save Address' : 'Update Address'}
          </button>
          {mode === 'edit' && (
            <Link href="/account/addresses" className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50">
              Cancel
            </Link>
          )}
        </div>
      </form>
    </section>
  )
}
