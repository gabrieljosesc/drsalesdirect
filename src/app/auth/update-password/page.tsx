'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

const RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const allRulesMet = RULES.every(r => r.test(password))
  const matches = password === confirm && confirm.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!allRulesMet) { setError('Password does not meet all requirements.'); return }
    if (!matches) { setError('Passwords do not match.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) { setError(updateError.message); return }
    setDone(true)
    setTimeout(() => router.push('/account'), 2000)
  }

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-xl border shadow-sm p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated!</h1>
          <p className="text-sm text-gray-500">Redirecting you to your account…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl border shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set a new password</h1>
        <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="password">New Password</Label>
            <div className="relative mt-1">
              <Input
                id="password" type={showPw ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="new-password" className="pr-10"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Password requirements */}
            <ul className="mt-2 space-y-1">
              {RULES.map(r => (
                <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle className="w-3 h-3 flex-shrink-0" />
                  {r.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Label htmlFor="confirm">Confirm New Password</Label>
            <Input
              id="confirm" type="password"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password" className="mt-1"
            />
            {confirm.length > 0 && !matches && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit" disabled={loading || !allRulesMet || !matches}
            className="w-full bg-[#ec6a82] hover:bg-[#d95672]"
          >
            {loading ? 'Updating…' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
