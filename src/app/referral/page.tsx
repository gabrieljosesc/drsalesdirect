import Link from 'next/link'
import type { Metadata } from 'next'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Gift, Wallet, Users, BadgeCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Referral & Rewards' }

const steps = [
  { icon: Users, title: 'Invite a Colleague', desc: 'Share Dr Sales Direct with fellow licensed medical professionals.' },
  { icon: BadgeCheck, title: 'They Place an Order', desc: 'Your referral registers and completes their first qualifying order.' },
  { icon: Gift, title: 'You Both Get Rewarded', desc: 'You and your colleague each receive a reward toward your next purchase.' },
]

export default function ReferralPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-[#ec6a82] to-[#2a5a8c] text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Wallet className="w-12 h-12 mx-auto text-blue-200 mb-4" />
          <h1 className="text-4xl font-bold mb-3">Cash Back &amp; Referral Program</h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Get rewarded for ordering and for sharing Dr Sales Direct with your network.
            Earn cash back on every order and bonus rewards for every colleague you refer.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#ec6a82]/10 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-[#ec6a82]" />
              </div>
              <p className="text-xs font-semibold text-[#ec6a82] mb-1">STEP {i + 1}</p>
              <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-gray-50 border p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to start earning?</h3>
          <p className="text-gray-500 mb-6">Create your free account or contact our team to learn more about your rewards.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/auth/register" className={cn(buttonVariants(), 'bg-[#ec6a82] hover:bg-[#d95672]')}>Create Account</Link>
            <Link href="/contact" className={cn(buttonVariants({ variant: 'outline' }))}>Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
