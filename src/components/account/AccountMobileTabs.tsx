'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/payment-methods', label: 'Banks & Cards' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/password', label: 'Password' },
  { href: '/account/notifications', label: 'Notifications' },
  { href: '/account/privacy', label: 'Privacy' },
]

export function AccountMobileTabs() {
  const pathname = usePathname()
  return (
    <div className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto">
      <div className="flex gap-2 w-max">
        {TABS.map(t => {
          const active = pathname === t.href || (t.href === '/account/orders' && pathname?.startsWith('/account/orders'))
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch={false}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                active ? 'bg-[#ec6a82] text-white border-[#ec6a82]' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {t.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
