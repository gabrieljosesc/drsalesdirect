'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loginAction, type LoginState } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export function LoginForm() {
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered') === '1'
  const verified = searchParams.get('verified') === '1'
  const next = searchParams.get('next') ?? searchParams.get('redirectTo') ?? '/'

  const [state, action, pending] = useActionState(loginAction, null)
  const error = state && 'error' in state ? state.error : null

  // Controlled so a failed login (server-action re-render) keeps what was typed
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl border shadow-sm p-8">

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

        {verified && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Your email has been verified! Please sign in below.</span>
          </div>
        )}

        {registered && !verified && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Account created! Please check your email to verify your address, then sign in below.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form action={action} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next} />

          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email" name="email" type="email"
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" required
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-[#ec6a82] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password" name="password" type="password"
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password" required
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-[#ec6a82] hover:bg-[#152f4a]"
          >
            {pending ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-[#ec6a82] font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
