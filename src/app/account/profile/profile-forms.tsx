'use client'

import Image from 'next/image'
import { useActionState, useState } from 'react'
import { updateProfile, uploadAvatar, removeAvatar, type ActionState } from '@/app/actions/account'

interface ProfileData {
  full_name: string
  phone: string
  company: string
  profession: string
  license_holder_name: string
  specialty: string
  business_phone: string
  website: string
  license_number: string
  license_expiry: string
  license_state: string
  license_country: string
  avatar_url: string | null
}

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]'
const labelClass = 'font-medium text-gray-700'

export function ProfileForms({ profile, emailMasked }: { profile: ProfileData; emailMasked: string }) {
  const [profileState, profileAction] = useActionState(updateProfile, {} as ActionState)
  const [avatarState, avatarAction] = useActionState(uploadAvatar, {} as ActionState)
  const [removeState, removeAction] = useActionState(removeAvatar, {} as ActionState)
  const [confirmRemove, setConfirmRemove] = useState(false)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
      {/* Left: details */}
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Personal & Professional Details</h2>
          <form action={profileAction} className="mt-5 space-y-4">
            <label className="block text-sm">
              <span className={labelClass}>Full name <span className="text-red-500">*</span></span>
              <input name="full_name" required defaultValue={profile.full_name} className={inputClass} autoComplete="name" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className={labelClass}>Phone</span>
                <input name="phone" defaultValue={profile.phone} className={inputClass} autoComplete="tel" />
              </label>
              <label className="block text-sm">
                <span className={labelClass}>Company / Clinic</span>
                <input name="company" defaultValue={profile.company} className={inputClass} autoComplete="organization" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className={labelClass}>Specialty</span>
                <input name="specialty" defaultValue={profile.specialty} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className={labelClass}>Business phone</span>
                <input name="business_phone" defaultValue={profile.business_phone} className={inputClass} />
              </label>
            </div>
            <label className="block text-sm">
              <span className={labelClass}>Website</span>
              <input name="website" type="url" defaultValue={profile.website} placeholder="https://…" className={inputClass} />
            </label>

            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mt-3 mb-1">Medical License</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className={labelClass}>Name</span>
                <input name="license_holder_name" defaultValue={profile.license_holder_name} placeholder="Name on the license" className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className={labelClass}>License type</span>
                <input name="profession" defaultValue={profile.profession} placeholder="e.g. Physician, Aesthetician" className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className={labelClass}>License number</span>
                <input name="license_number" defaultValue={profile.license_number} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className={labelClass}>Expiry date</span>
                <input name="license_expiry" type="date" defaultValue={profile.license_expiry ? String(profile.license_expiry).slice(0, 10) : ''} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className={labelClass}>State issued</span>
                <input name="license_state" defaultValue={profile.license_state} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className={labelClass}>Country issued</span>
                <input name="license_country" defaultValue={profile.license_country} className={inputClass} />
              </label>
            </div>

            {profileState.error && <p className="text-sm text-red-600">{profileState.error}</p>}
            {profileState.ok && <p className="text-sm text-green-700">{profileState.ok}</p>}
            <div className="pt-1">
              <button type="submit" className="rounded-md bg-[#ec6a82] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#d95672]">
                Save Changes
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Email</h2>
          <p className="mt-1 text-sm text-gray-500">Email is tied to your sign-in. Contact support to change it.</p>
          <p className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800">
            {emailMasked}
          </p>
        </section>
      </div>

      {/* Right: avatar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Photo</h2>
        <p className="mt-1 text-xs text-gray-500">JPEG, PNG or WebP, max 1 MB.</p>
        <div className="relative mx-auto mt-4 aspect-square w-40 overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-200">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt="" fill className="object-cover" sizes="160px" unoptimized={profile.avatar_url.includes('%')} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[#ec6a82]">
              {(profile.full_name || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        {profile.avatar_url && (
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              ✕ Remove photo
            </button>
          </div>
        )}
        <form action={avatarAction} className="mt-4 space-y-2">
          <input
            name="avatar" type="file" accept="image/jpeg,image/png,image/webp"
            className="w-full text-xs text-gray-600 file:mr-2 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-2 file:py-1"
          />
          {avatarState.error && <p className="text-xs text-red-600">{avatarState.error}</p>}
          {avatarState.ok && <p className="text-xs text-green-700">{avatarState.ok}</p>}
          {removeState.error && <p className="text-xs text-red-600">{removeState.error}</p>}
          {removeState.ok && <p className="text-xs text-green-700">{removeState.ok}</p>}
          <button type="submit" className="w-full rounded-md border border-[#ec6a82] py-2 text-sm font-medium text-[#ec6a82] hover:bg-blue-50">
            Upload Photo
          </button>
        </form>
      </div>

      {/* Remove confirm modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Remove profile photo?</h3>
            <p className="mt-2 text-sm text-gray-600">Are you sure you want to remove your profile photo?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmRemove(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <form action={removeAction} onSubmit={() => setConfirmRemove(false)}>
                <button type="submit" className="rounded-md bg-[#ec6a82] px-4 py-2 text-sm font-medium text-white hover:bg-[#d95672]">
                  Yes, remove
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
