'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, CreditCard, MapPin, Lock, Bell, Shield, Package, LogOut } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'

const ACCOUNT_LINKS = [
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/payment-methods', label: 'Banks & Cards', icon: CreditCard },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/password', label: 'Change Password', icon: Lock },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
  { href: '/account/privacy', label: 'Privacy', icon: Shield },
] as const

export function AccountSidebar({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string
  email: string
  avatarUrl: string | null
}) {
  const pathname = usePathname()
  const ordersActive = pathname?.startsWith('/account/orders')

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      {/* Profile card */}
      <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill className="object-cover" sizes="56px" unoptimized={avatarUrl.includes('%')} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#ec6a82]">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{displayName}</p>
          <p className="truncate text-xs text-gray-500">{email}</p>
          <Link href="/account/profile" prefetch={false} className="mt-1 inline-block text-xs font-medium text-[#ec6a82] hover:underline">
            Edit profile
          </Link>
        </div>
      </div>

      <nav className="space-y-6 text-sm">
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">My Account</p>
          <ul className="space-y-0.5">
            {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <li key={href}>
                  <Link
                    href={href}
                    prefetch={false}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                      active ? 'bg-[#ec6a82] text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Orders</p>
          <Link
            href="/account/orders"
            prefetch={false}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
              ordersActive ? 'bg-[#ec6a82] text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4" /> My Orders
          </Link>
        </div>

        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Session</p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2 font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </form>
        </div>
      </nav>
    </aside>
  )
}
