'use client'

import { useActionState } from 'react'
import { changePassword, type ActionState } from '@/app/actions/account'

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec6a82]'

export default function PasswordPage() {
  const [state, action] = useActionState(changePassword, {} as ActionState)
  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
        <p className="mt-1 text-sm text-gray-500">Use a strong password you do not reuse elsewhere.</p>
      </div>
      <form action={action} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">New password</span>
          <input name="new_password" type="password" required autoComplete="new-password" minLength={8} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Confirm new password</span>
          <input name="confirm_password" type="password" required autoComplete="new-password" minLength={8} className={inputClass} />
        </label>
        <p className="text-xs text-gray-400">At least 8 characters, with 1 uppercase letter, 1 number, and 1 special character.</p>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
        <button type="submit" className="rounded-md bg-[#ec6a82] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#d95672]">
          Update Password
        </button>
      </form>
    </div>
  )
}
