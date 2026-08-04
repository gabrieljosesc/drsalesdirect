import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/hooks/useCart'
import { WishlistProvider } from '@/hooks/useWishlist'
import { Toaster } from '@/components/ui/sonner'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import NavigationProgress from '@/components/layout/NavigationProgress'
import { FloatingCart } from '@/components/FloatingCart'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Dr Sales Direct — Medical Supplies for Professionals',
    template: '%s | Dr Sales Direct',
  },
  description:
    'International medical supplier specializing in aesthetic injectables, dermal fillers, botulinum toxins, orthopedic, and more. Serving licensed professionals since 2012.',
  keywords: ['medical wholesale', 'dermal fillers', 'botox', 'medical supplies', 'aesthetic products'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'Dr Sales Direct',
  },
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()

  const admin = createAdminClient()
  const [{ data: allCategories }, { data: navSamples }] = await Promise.all([
    admin
      .from('categories')
      .select('id, slug, name, parent_id, sort_order')
      .order('sort_order'),
    admin
      .from('products')
      .select('slug, title, base_price, images:product_images(url, sort_order)')
      .eq('is_featured', true)
      .eq('is_active', true)
      .limit(3),
  ])

  // Primary navigation = top-level categories with sort_order < 100 (the
  // client's seven); each carries its child categories (Dermatology umbrella).
  const cats = allCategories ?? []
  const categories = cats
    .filter(c => !c.parent_id && (c.sort_order ?? 0) < 100)
    .map(c => ({
      id: c.id, slug: c.slug, name: c.name, parent_id: c.parent_id,
      children: cats
        .filter(k => k.parent_id === c.id)
        .map(k => ({ id: k.id, slug: k.slug, name: k.name })),
    }))

  // Flatten the hero image for each nav sample product
  const samples = (navSamples ?? []).map(p => ({
    slug: p.slug,
    title: p.title,
    base_price: Number(p.base_price),
    image: (p.images ?? []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)[0]?.url ?? null,
  }))

  // Fetch role + name for the navbar
  let isAdmin = false
  let displayName: string | null = null
  if (user) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
    displayName = (profile?.full_name && profile.full_name.trim())
      || user.email?.split('@')[0]
      || null
  }

  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-gray-50`}>
        <CartProvider>
          <WishlistProvider>
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            <Navbar user={user} categories={categories ?? []} navSamples={samples} isAdmin={isAdmin} displayName={displayName} />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <FloatingCart />
            <Toaster position="top-right" richColors />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  )
}
