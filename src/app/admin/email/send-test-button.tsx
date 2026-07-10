'use client'

import { useActionState } from 'react'
import { sendTestEmailAction, type TestEmailState } from './actions'

export function SendTestEmailButton() {
  const [state, action, pending] = useActionState<TestEmailState, FormData>(
    async () => sendTestEmailAction(),
    null
  )

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[#ec6a82] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d95672] disabled:opacity-60 transition-colors"
      >
        {pending ? 'Sending…' : 'Send Test Email'}
      </button>
      {state && (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            state.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  )
}
