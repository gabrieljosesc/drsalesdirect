'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  verifyEmailAction, resendVerificationAction, type VerifyEmailState,
} from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MailCheck, CheckCircle } from 'lucide-react'

export function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [state, action, pending] = useActionState<VerifyEmailState, FormData>(verifyEmailAction, null)
  const [resendState, resendAction, resendPending] = useActionState<VerifyEmailState, FormData>(resendVerificationAction, null)
  const [token, setToken] = useState('')

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl border shadow-sm p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#ec6a82]/10">
          <MailCheck className="h-6 w-6 text-[#ec6a82]" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Verify your email</h1>
        <p className="text-sm text-gray-500 mb-6">
          We sent a verification code to{' '}
          <span className="font-medium text-gray-800">{email || 'your email address'}</span>.
          Enter it below to activate your account.
        </p>

        {state?.error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {resendState?.resent && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>A new code is on its way — check your inbox (and spam folder).</span>
          </div>
        )}

        <form action={action} className="space-y-4" noValidate>
          <input type="hidden" name="email" value={email} />
          <div>
            <Label htmlFor="token">Verification code</Label>
            <Input
              id="token" name="token" inputMode="numeric" autoComplete="one-time-code"
              maxLength={10} placeholder="12345678" required autoFocus
              value={token}
              onChange={e => setToken(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="mt-1 text-center text-2xl font-mono tracking-[0.35em]"
            />
          </div>
          <Button
            type="submit"
            disabled={pending || token.length < 6}
            className="w-full bg-[#ec6a82] hover:bg-[#d95672]"
          >
            {pending ? 'Verifying…' : 'Verify Email'}
          </Button>
        </form>

        <form action={resendAction} className="mt-4 text-center">
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={resendPending || !email}
            className="text-sm text-[#ec6a82] hover:underline disabled:opacity-50"
          >
            {resendPending ? 'Sending…' : "Didn't receive it? Resend the code"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Wrong email address?{' '}
          <Link href="/auth/register" className="text-[#ec6a82] font-medium hover:underline">
            Register again
          </Link>
        </p>
      </div>
    </div>
  )
}
