'use client'

import { Suspense, useActionState, useCallback, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { registerAction, type RegisterState } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import type { ParsedAddress } from '@/lib/parse-google-place'

// ── Helpers ────────────────────────────────────────────────────────────────
function err(state: RegisterState, key: string): string | undefined {
  if (!state || !('fieldErrors' in state)) return undefined
  return state.fieldErrors?.[key]
}

function val(state: RegisterState, key: string): string {
  if (!state || !('values' in state)) return ''
  return state.values?.[key] ?? ''
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-600">{msg}</p>
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 pb-2 mb-4 mt-6">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{children}</h2>
    </div>
  )
}

// ── Password field with show/hide toggle ────────────────────────────────────
function PasswordInput({ name, label, required, defaultValue, error, placeholder }: {
  name: string; label: string; required?: boolean
  defaultValue?: string; error?: string; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <Label htmlFor={name}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <div className="relative mt-1">
        <Input
          id={name}
          name={name}
          type={show ? 'text' : 'password'}
          defaultValue={defaultValue}
          autoComplete={name === 'password' ? 'new-password' : 'new-password'}
          className={`pr-10 ${error ? 'border-red-400 bg-red-50 focus-visible:ring-red-300' : ''}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <FieldError msg={error} />
    </div>
  )
}

// ── Select wrapper ─────────────────────────────────────────────────────────
function SelectField({ name, label, required, defaultValue, error, children }: {
  name: string; label: string; required?: boolean
  defaultValue?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <Label htmlFor={name}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82] bg-white ${
          error ? 'border-red-400 bg-red-50' : 'border-input'
        }`}
      >
        {children}
      </select>
      <FieldError msg={error} />
    </div>
  )
}

// ── Form ────────────────────────────────────────────────────────────────────
function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, null)

  // Controlled address fields so autocomplete can fill them
  const [addressLine1, setAddressLine1] = useState(() => val(null, 'address_line1'))
  const [city, setCity]               = useState(() => val(null, 'city'))
  const [addrState, setAddrState]     = useState(() => val(null, 'state'))
  const [postalCode, setPostalCode]   = useState(() => val(null, 'postal_code'))
  const [country, setCountry]         = useState(() => val(null, 'country'))

  const handleAddressSelect = useCallback((parsed: ParsedAddress) => {
    setAddressLine1(parsed.line1)
    setCity(parsed.city)
    setAddrState(parsed.state)
    setPostalCode(parsed.postalCode)
    setCountry(parsed.country)
  }, [])

  const globalError = state && 'error' in state ? state.error : null

  return (
    <div className="min-h-[70vh] flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white rounded-xl border shadow-sm p-8">

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create an Account</h1>
        <p className="text-sm text-gray-500 mb-2">
          For licensed medical professionals only. Fields marked <span className="text-red-500">*</span> are required.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          By registering you agree to our{' '}
          <Link href="/legal/terms" className="text-[#ec6a82] hover:underline">Terms of Service</Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="text-[#ec6a82] hover:underline">Privacy Policy</Link>.
        </p>

        {globalError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        <form action={action} className="space-y-4" noValidate>

          {/* ── Account ─────────────────────────────────────────────────── */}
          <SectionHeading>Account</SectionHeading>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email" name="email" type="email" autoComplete="email"
                defaultValue={val(state, 'email')}
                className={`mt-1 ${err(state, 'email') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'email')} />
            </div>
            <div>
              <Label htmlFor="confirm_email">Confirm Email <span className="text-red-500">*</span></Label>
              <Input
                id="confirm_email" name="confirm_email" type="email" autoComplete="email"
                defaultValue={val(state, 'confirm_email')}
                className={`mt-1 ${err(state, 'confirm_email') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'confirm_email')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PasswordInput
              name="password" label="Password" required
              defaultValue={val(state, 'password')}
              error={err(state, 'password')}
            />
            <PasswordInput
              name="confirm_password" label="Confirm Password" required
              defaultValue={val(state, 'confirm_password')}
              error={err(state, 'confirm_password')}
            />
          </div>
          <p className="text-xs text-gray-400 -mt-2">
            At least 8 characters with 1 uppercase letter, 1 number, and 1 special character.
          </p>

          {/* ── Contact Information ───────────────────────────────────── */}
          <SectionHeading>Contact Information</SectionHeading>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SelectField name="prefix" label="Prefix" defaultValue={val(state, 'prefix')} error={err(state, 'prefix')}>
              <option value="">Select</option>
              <option>Mr.</option>
              <option>Mrs.</option>
              <option>Ms.</option>
              <option>Dr.</option>
              <option>Prof.</option>
            </SelectField>
            <div>
              <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
              <Input
                id="first_name" name="first_name" autoComplete="given-name"
                defaultValue={val(state, 'first_name')}
                className={`mt-1 ${err(state, 'first_name') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'first_name')} />
            </div>
            <div>
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input
                id="middle_name" name="middle_name"
                defaultValue={val(state, 'middle_name')}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
              <Input
                id="last_name" name="last_name" autoComplete="family-name"
                defaultValue={val(state, 'last_name')}
                className={`mt-1 ${err(state, 'last_name') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'last_name')} />
            </div>
            <div>
              <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
              <Input
                id="phone" name="phone" type="tel" autoComplete="tel"
                defaultValue={val(state, 'phone')}
                placeholder="+1 (555) 000-0000"
                className={`mt-1 ${err(state, 'phone') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'phone')} />
            </div>
          </div>

          {/* ── Delivery Address ─────────────────────────────────────── */}
          <SectionHeading>Delivery Address</SectionHeading>

          <div>
            <Label htmlFor="address_line1">
              Street Address <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1">
              <AddressAutocomplete
                name="address_line1"
                value={addressLine1}
                onChange={setAddressLine1}
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing your address…"
                hasError={!!err(state, 'address_line1')}
              />
            </div>
            {/* Hidden inputs so server action can read controlled values */}
            <input type="hidden" name="city"        value={city} />
            <input type="hidden" name="state"       value={addrState} />
            <input type="hidden" name="postal_code" value={postalCode} />
            <input type="hidden" name="country"     value={country} />
            <FieldError msg={err(state, 'address_line1')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city_display">City <span className="text-red-500">*</span></Label>
              <Input
                id="city_display"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="City"
                className={`mt-1 ${err(state, 'city') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'city')} />
            </div>
            <div>
              <Label htmlFor="state_display">State / Province <span className="text-red-500">*</span></Label>
              <Input
                id="state_display"
                value={addrState}
                onChange={e => setAddrState(e.target.value)}
                placeholder="State or province"
                className={`mt-1 ${err(state, 'state') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'state')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postal_display">ZIP / Postal Code <span className="text-red-500">*</span></Label>
              <Input
                id="postal_display"
                value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
                placeholder="ZIP or postal code"
                className={`mt-1 ${err(state, 'postal_code') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'postal_code')} />
            </div>
            <div>
              <Label htmlFor="country_display">Country <span className="text-red-500">*</span></Label>
              <Input
                id="country_display"
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="Country"
                className={`mt-1 ${err(state, 'country') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'country')} />
            </div>
          </div>

          {/* ── Business Information ──────────────────────────────────── */}
          <SectionHeading>Business Information</SectionHeading>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Company / Clinic Name <span className="text-red-500">*</span></Label>
              <Input
                id="company" name="company" autoComplete="organization"
                defaultValue={val(state, 'company')}
                className={`mt-1 ${err(state, 'company') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'company')} />
            </div>
            <div>
              <Label htmlFor="business_phone">Business Phone <span className="text-red-500">*</span></Label>
              <Input
                id="business_phone" name="business_phone" type="tel"
                defaultValue={val(state, 'business_phone')}
                placeholder="+1 (555) 000-0000"
                className={`mt-1 ${err(state, 'business_phone') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'business_phone')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty" name="specialty"
                defaultValue={val(state, 'specialty')}
                placeholder="e.g. Dermatology, Aesthetics"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website" name="website" type="url" autoComplete="url"
                defaultValue={val(state, 'website')}
                placeholder="https://yourclinic.com (optional)"
                className="mt-1"
              />
            </div>
          </div>

          {/* ── Medical License ──────────────────────────────────────── */}
          <SectionHeading>Medical License</SectionHeading>
          <p className="text-xs text-gray-500 -mt-2">
            Details of the licensed professional these orders are placed under. If you are the
            business owner, this can be a doctor at your clinic.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="license_holder_name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="license_holder_name" name="license_holder_name"
                defaultValue={val(state, 'license_holder_name')}
                placeholder="Name on the license"
                className={`mt-1 ${err(state, 'license_holder_name') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'license_holder_name')} />
            </div>
            <div>
              <Label htmlFor="profession">License Type <span className="text-red-500">*</span></Label>
              <Input
                id="profession" name="profession"
                defaultValue={val(state, 'profession')}
                placeholder="e.g. Physician, Aesthetician, Nurse Practitioner"
                className={`mt-1 ${err(state, 'profession') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'profession')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="license_number">License Number <span className="text-red-500">*</span></Label>
              <Input
                id="license_number" name="license_number" autoComplete="off"
                defaultValue={val(state, 'license_number')}
                className={`mt-1 ${err(state, 'license_number') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'license_number')} />
            </div>
            <div>
              <Label htmlFor="license_expiry">Expiry Date <span className="text-red-500">*</span></Label>
              <Input
                id="license_expiry" name="license_expiry" type="date"
                defaultValue={val(state, 'license_expiry')}
                className={`mt-1 ${err(state, 'license_expiry') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'license_expiry')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="license_state">State Issued <span className="text-red-500">*</span></Label>
              <Input
                id="license_state" name="license_state"
                defaultValue={val(state, 'license_state')}
                placeholder="e.g. California, Ontario"
                className={`mt-1 ${err(state, 'license_state') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'license_state')} />
            </div>
            <div>
              <Label htmlFor="license_country">Country Issued <span className="text-red-500">*</span></Label>
              <Input
                id="license_country" name="license_country"
                defaultValue={val(state, 'license_country')}
                placeholder="e.g. United States, Canada"
                className={`mt-1 ${err(state, 'license_country') ? 'border-red-400 bg-red-50' : ''}`}
              />
              <FieldError msg={err(state, 'license_country')} />
            </div>
          </div>

          {/* ── Agreement ─────────────────────────────────────────────── */}
          <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
            <input
              type="checkbox" required
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#ec6a82] flex-shrink-0"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              I confirm I am a licensed medical professional authorized to purchase regulated
              medical / aesthetic supplies, and that my license information is accurate and current.
            </span>
          </label>

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-[#ec6a82] hover:bg-[#d95672] mt-2"
          >
            {pending ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#ec6a82] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
