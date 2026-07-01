'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null)

  if (state?.sent) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-xl border shadow-sm p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-sm text-gray-500 mb-6">
            If an account exists for that email address, we&apos;ve sent a password reset link.
            Check your inbox (and spam folder).
          </p>
          <Link href="/auth/login" className="text-sm text-[#ec6a82] font-medium hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl border shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        {state?.error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={action} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email" name="email" type="email"
              autoComplete="email" required
              className="mt-1"
            />
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-[#ec6a82] hover:bg-[#152f4a]"
          >
            {pending ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/auth/login" className="text-[#ec6a82] font-medium hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
