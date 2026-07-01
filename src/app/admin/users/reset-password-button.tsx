'use client'

import { useState } from 'react'
import { sendPasswordResetAction } from '@/app/actions/admin'

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleClick() {
    if (!confirm('Send a password reset email to this user?')) return
    setStatus('loading')
    const res = await sendPasswordResetAction(userId)
    setStatus(res.ok ? 'ok' : 'error')
    setMessage(res.message)
    if (res.ok) setTimeout(() => setStatus('idle'), 4000)
  }

  if (status === 'ok') return <span className="text-xs font-medium text-green-700">✓ Reset sent</span>
  if (status === 'error') return <span className="text-xs text-red-600" title={message}>Error — {message.slice(0, 40)}</span>

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
    >
      {status === 'loading' ? 'Sending…' : 'Reset password'}
    </button>
  )
}
