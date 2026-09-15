import { Suspense } from 'react'
import type { Metadata } from 'next'
import { VerifyEmailForm } from './verify-email-form'

export const metadata: Metadata = {
  title: 'Verify Your Email',
  description: 'Enter the one-time code we emailed you to activate your account.',
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  )
}
