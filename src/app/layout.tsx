import type { Metadata } from 'next'
import { Suspense } from 'react'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/hooks/useCart'
import { WishlistProvider } from '@/hooks/useWishlist'
import { Toaster } from '@/components/ui/sonner'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import NavigationProgress from '@/components/layout/NavigationProgress'
import { FloatingCart } from '@/components/FloatingCart'
import LuckyOrangeBrandFix from '@/components/LuckyOrangeBrandFix'
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
            {/* Live chat is Lucky Orange's built-in chat widget (loaded via
                lo.js below) — its appearance/logo is configured in the Lucky
                Orange dashboard, not here. BrandFix overrides the widget's
                avatar with the current logo until the dashboard is updated. */}
            <LuckyOrangeBrandFix />
            <Toaster position="top-right" richColors />
          </WishlistProvider>
        </CartProvider>
        {/* Google Analytics 4 (site-wide). Measurement IDs are public; the env
            var allows an override without a code change. */}
        {(() => {
          const gaId = process.env.NEXT_PUBLIC_GA_ID ?? 'G-XVQL50EDMM'
          return (
            <>
              <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              />
              <Script id="ga4-init" strategy="afterInteractive">
                {`window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');`}
              </Script>
            </>
          )
        })()}
        {/* Apollo.io website visitor tracking (client-provided snippet) */}
        <Script id="apollo-tracker" strategy="afterInteractive">
          {`function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");
o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,
o.onload=function(){window.trackingFunctions.onLoad({appId:"6a038359296b71001d5f2419"})},
document.head.appendChild(o)}initApollo();`}
        </Script>
        {/* Lucky Orange session recording — inert until the site ID is set in env */}
        {process.env.NEXT_PUBLIC_LUCKY_ORANGE_SITE_ID && (
          <Script
            strategy="afterInteractive"
            src={`https://tools.luckyorange.com/core/lo.js?site-id=${process.env.NEXT_PUBLIC_LUCKY_ORANGE_SITE_ID}`}
          />
        )}
      </body>
    </html>
  )
}
