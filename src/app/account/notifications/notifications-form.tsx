'use client'

import { useActionState } from 'react'
import { saveNotificationSettings, type ActionState } from '@/app/actions/account'

export function NotificationsForm({
  emailOrderUpdates,
  emailProductNews,
}: {
  emailOrderUpdates: boolean
  emailProductNews: boolean
}) {
  const [state, action] = useActionState(saveNotificationSettings, {} as ActionState)
  return (
    <form action={action} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name="email_order_updates" defaultChecked={emailOrderUpdates} className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#ec6a82]" />
        <span>
          <span className="font-medium text-gray-800">Order updates</span>
          <span className="block text-gray-500">Status changes, shipping notes, and support messages.</span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name="email_product_news" defaultChecked={emailProductNews} className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#ec6a82]" />
        <span>
          <span className="font-medium text-gray-800">Product news</span>
          <span className="block text-gray-500">Occasional updates on new products and restocks.</span>
        </span>
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      <button type="submit" className="rounded-md bg-[#ec6a82] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#152f4a]">
        Save Preferences
      </button>
    </form>
  )
}
