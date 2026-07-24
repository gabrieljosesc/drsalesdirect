'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, Heart, User, Search, Menu, ChevronDown, X } from 'lucide-react'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { useWishlist } from '@/hooks/useWishlist'
import { cn, formatPrice } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import SearchBar from '@/components/products/SearchBar'
import { logoutAction } from '@/app/actions/auth'

interface Category {
  id: string
  slug: string
  name: string
  parent_id: string | null
}

interface NavSample {
  slug: string
  title: string
  base_price: number
  image: string | null
}

interface Props {
  user: { id: string; email?: string } | null
  categories: Category[]
  navSamples?: NavSample[]
  isAdmin?: boolean
  displayName?: string | null
}

export default function Navbar({ user, categories, navSamples = [], isAdmin, displayName }: Props) {
  const { count } = useCart()
  const { count: wishCount } = useWishlist()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const navLink = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        'text-[15px] font-medium transition-colors',
        active ? 'text-[#ec6a82]' : 'text-gray-600 hover:text-[#ec6a82]'
      )}
    >
      {label}
    </Link>
  )

  return (
    <header className="w-full sticky top-0 z-50 bg-white border-b shadow-sm">
      {/* Scrolling announcement ticker */}
      <AnnouncementBar />

      {/* Main nav row */}
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-6">
        {/* Left group: logo + nav */}
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image src="/logo.png" alt="Dr Sales Direct" width={560} height={197} priority unoptimized className="h-12 sm:h-14 w-auto" />
          </Link>

          {/* Nav (desktop, left-aligned beside logo) */}
          <nav className="hidden lg:flex items-center gap-8">
          {navLink('/', 'Home', pathname === '/')}

          {/* Products dropdown */}
          <div className="group relative">
            <button className={cn(
              'flex items-center gap-1 text-[15px] font-medium transition-colors',
              pathname.startsWith('/shop') ? 'text-[#ec6a82]' : 'text-gray-600 hover:text-[#ec6a82]'
            )}>
              Products <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 hidden group-hover:block z-50">
              <div className="w-[720px] bg-white rounded-xl border shadow-xl p-4 grid grid-cols-[1fr_280px] gap-4">
                {/* Categories */}
                <div>
                  <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Shop by Category</p>
                  <div className="grid grid-cols-2 gap-0.5">
                    {categories.map(cat => (
                      <Link
                        key={cat.slug}
                        href={`/shop/${cat.slug}`}
                        className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#ec6a82] transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/shop"
                    className="mt-2 block rounded-lg px-3 py-2 text-sm font-semibold text-[#ec6a82] bg-rose-50 hover:bg-rose-100 text-center transition-colors"
                  >
                    View All Products →
                  </Link>
                </div>

                {/* Featured product thumbnails */}
                {navSamples.length > 0 && (
                  <div className="border-l pl-4">
                    <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Featured</p>
                    <div className="space-y-1">
                      {navSamples.map(p => (
                        <Link
                          key={p.slug}
                          href={`/product/${p.slug}`}
                          className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 transition-colors group/item"
                        >
                          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border bg-gray-50">
                            {p.image ? (
                              <Image src={p.image} alt="" fill className="object-contain p-1" sizes="48px" unoptimized />
                            ) : (
                              <ShoppingCart className="absolute inset-0 m-auto w-4 h-4 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-gray-800 group-hover/item:text-[#ec6a82]">{p.title}</p>
                            {p.base_price > 0 && <p className="text-xs font-semibold text-[#ec6a82]">{formatPrice(p.base_price)}</p>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {navLink('/peptides', 'Peptides', pathname === '/peptides')}
          {navLink('/about', 'About us', pathname === '/about')}
          {navLink('/blog', 'Blog', pathname.startsWith('/blog'))}
          {navLink('/contact', 'Contact us', pathname === '/contact')}
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(v => !v)}
            className="inline-flex items-center justify-center size-9 rounded-lg hover:bg-muted transition-colors"
            aria-label="Search"
          >
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          <Link href="/wishlist" className="relative hidden sm:inline-flex items-center justify-center size-9 rounded-lg hover:bg-muted transition-colors">
            <Heart className="w-5 h-5" />
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#ec6a82] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {wishCount > 99 ? '99+' : wishCount}
              </span>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger render={
              user ? (
                <button className="inline-flex items-center gap-2 rounded-lg px-2 h-9 hover:bg-muted transition-colors">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#ec6a82] text-white text-xs font-semibold flex-shrink-0">
                    {(displayName ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden sm:block max-w-[120px] truncate text-sm font-medium text-gray-700">{displayName}</span>
                </button>
              ) : (
                <button className="inline-flex items-center justify-center size-9 rounded-lg hover:bg-muted transition-colors">
                  <User className="w-5 h-5" />
                </button>
              )
            } />
            <DropdownMenuContent align="end">
              {user ? (
                <>
                  <DropdownMenuItem onClick={() => router.push('/account')}>My Account</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/account/orders')}>Orders</DropdownMenuItem>
                  {isAdmin && <DropdownMenuItem onClick={() => router.push('/admin')}>Admin Panel</DropdownMenuItem>}
                  <DropdownMenuItem onClick={() => logoutAction()}>Sign Out</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => router.push('/auth/login')}>Login</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/auth/register')}>Register</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/cart" className="relative inline-flex items-center justify-center size-9 rounded-lg hover:bg-muted transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#ec6a82] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="lg:hidden inline-flex items-center justify-center size-9 rounded-lg hover:bg-muted transition-colors">
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto">
              <nav className="mt-6 space-y-0.5">
                <Link href="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#ec6a82]">Home</Link>
                <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Products</p>
                {categories.map(cat => (
                  <Link
                    key={cat.slug}
                    href={`/shop/${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'block px-3 py-2 text-sm rounded-md transition-colors',
                      pathname.startsWith(`/shop/${cat.slug}`) ? 'bg-[#ec6a82] text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-[#ec6a82]'
                    )}
                  >
                    {cat.name}
                  </Link>
                ))}
                <Link href="/shop" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-[#ec6a82] hover:bg-gray-100 rounded-md">All Products →</Link>
                <div className="pt-2 mt-2 border-t space-y-0.5">
                  <Link href="/peptides" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#ec6a82]">Peptides</Link>
                  <Link href="/about" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#ec6a82]">About us</Link>
                  <Link href="/blog" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#ec6a82]">Blog</Link>
                  <Link href="/contact" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-[#ec6a82]">Contact us</Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Search drawer */}
      {searchOpen && (
        <div className="border-t bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <SearchBar />
          </div>
        </div>
      )}
    </header>
  )
}
