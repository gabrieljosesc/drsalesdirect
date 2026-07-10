import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAuthUser } from '@/lib/supabase/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthUser('/admin')

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/')

  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/coupons', label: 'Coupons' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/blog', label: 'Blog' },
    { href: '/admin/email', label: 'Email' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-[60vh]">
      <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-gray-200 pb-4 text-sm font-medium">
        {links.map(l => (
          <Link key={l.href} href={l.href} className="text-[#ec6a82] hover:underline">
            {l.label}
          </Link>
        ))}
        <Link href="/" className="ml-auto text-gray-500 hover:underline">
          ← Storefront
        </Link>
      </div>
      {children}
    </div>
  )
}
