'use client'

import { useActionState } from 'react'
import { savePrivacySettings, type ActionState } from '@/app/actions/account'

export function PrivacyForm({ analyticsOptIn }: { analyticsOptIn: boolean }) {
  const [state, action] = useActionState(savePrivacySettings, {} as ActionState)
  return (
    <form action={action} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900">Preferences</h2>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name="analytics_opt_in" defaultChecked={analyticsOptIn} className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#ec6a82]" />
        <span>
          <span className="font-medium text-gray-800">Product improvement</span>
          <span className="block text-gray-500">Allow anonymized usage data to help us improve the storefront (no ads).</span>
        </span>
      </label>
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="mt-3 text-sm text-green-700">{state.ok}</p>}
      <button type="submit" className="mt-4 rounded-md bg-[#ec6a82] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#152f4a]">
        Save
      </button>
    </form>
  )
}
