import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/server'
import { Product } from '@/types'
import ProductCard from '@/components/products/ProductCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { blogImage } from '@/lib/blog-images'
import { getHomeBrands } from '@/lib/home-brands'
import HeroSlideshow from '@/components/home/HeroSlideshow'
import BrandMarquee from '@/components/home/BrandMarquee'
import HighlightSlides from '@/components/home/HighlightSlides'
import FeaturedCarousel from '@/components/home/FeaturedCarousel'
import FeaturedCategories from '@/components/home/FeaturedCategories'
import {
  ShieldCheck, Truck, HeadphonesIcon, Award, Gift, Wallet,
  Star,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const trustFeatures = [
  { icon: ShieldCheck, title: 'Authentic Products', desc: 'Sourced only from trusted, original manufacturers.' },
  { icon: Truck, title: 'Free Shipping $795+', desc: 'First order ships free — and every order over $795 after that.' },
  { icon: HeadphonesIcon, title: 'Friendly Support', desc: 'Reach us anytime by toll-free phone and email.' },
  { icon: Award, title: 'Trusted Since 2012', desc: 'A decade serving medical professionals worldwide.' },
]

const reviews = [
  { name: 'Dr. Sarah M.', role: 'Aesthetic Clinic, CA', text: 'Dr Sales Direct has been our go-to supplier for years. Authentic products, fast shipping, and the prices are unbeatable.', stars: 5 },
  { name: 'Dr. James R.', role: 'Rheumatology, MO', text: 'Ordering is simple and the team always confirms everything personally. Viscosupplements always arrive in perfect cold-chain condition.', stars: 5 },
  { name: 'Lauren T.', role: 'Med Spa Owner, TX', text: 'Great selection of fillers and toxins at wholesale prices. Customer service is genuinely helpful and responsive.', stars: 5 },
]

export default async function HomePage() {
  const supabase = createAdminClient()

  const [{ data: featured }, { data: carouselRaw }, { data: posts }, brands] = await Promise.all([
    supabase.from('products')
      .select('*, category:categories(*), images:product_images(id,url,sort_order)')
      .eq('is_featured', true).eq('is_active', true).limit(8),
    supabase.from('products')
      .select('id, slug, title, base_price, is_featured, images:product_images(url, sort_order)')
      .eq('is_active', true)
      .order('review_count', { ascending: false })
      .order('title')
      .limit(24),
    supabase.from('blog_posts')
      .select('slug, title, excerpt, published_at, image_url')
      .eq('is_published', true).order('published_at', { ascending: false }).limit(3),
    getHomeBrands(supabase),
  ])

  // Carousel: skip the best sellers already shown above
  const carousel = (carouselRaw ?? [])
    .filter(p => !p.is_featured)
    .slice(0, 16)
    .map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      base_price: Number(p.base_price),
      image: (p.images ?? []).sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
    }))

  return (
    <div>
      {/* ── HERO SLIDESHOW ───────────────────────────────────────────── */}
      <HeroSlideshow />

      {/* ── TRUST BAR ────────────────────────────────────────────────── */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustFeatures.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ec6a82]/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#ec6a82]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BRAND MARQUEE ────────────────────────────────────────────── */}
      <BrandMarquee brands={brands} />

      {/* ── CATEGORIES ───────────────────────────────────────────────── */}
      <FeaturedCategories />

      {/* ── BEST SELLERS ─────────────────────────────────────────────── */}
      {featured && featured.length > 0 && (
        <section className="bg-gray-50 border-y">
          <div className="max-w-7xl mx-auto px-4 py-14">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Our Best Sellers</h2>
                <p className="text-gray-500 mt-2">Discover Dr Sales Direct&apos;s best-selling products.</p>
              </div>
              <Link href="/shop" className="text-sm text-[#ec6a82] hover:underline font-medium whitespace-nowrap">View all →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(featured as Product[]).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS CAROUSEL ───────────────────────────────── */}
      {carousel.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
            <p className="text-gray-500 mt-2">A quick look through our catalog — scroll to explore.</p>
          </div>
          <FeaturedCarousel products={carousel} />
          <div className="mt-8 text-center">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-full bg-[#ec6a82] px-10 py-3.5 text-sm font-bold tracking-widest text-white uppercase hover:bg-[#d95672] transition-colors shadow-md"
            >
              Shop All Products
            </Link>
          </div>
        </section>
      )}

      {/* ── MONTHLY HIGHLIGHTS ───────────────────────────────────────── */}
      <HighlightSlides />

      {/* ── CASH BACK & REFERRAL ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ec6a82] to-[#2a5a8c] text-white p-8 lg:p-10">
            <Wallet className="w-10 h-10 text-blue-200 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Get Cash Back on Every Order</h3>
            <p className="text-white/80 mb-6 max-w-md">
              Earn rewards on your purchases and redeem them toward future orders. The more you order, the more you save.
            </p>
            <Link href="/referral" className={cn(buttonVariants(), 'bg-white text-[#ec6a82] hover:bg-gray-100 font-semibold')}>
              Start Earning
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ec6a82] to-[#1e3a8a] text-white p-8 lg:p-10">
            <Gift className="w-10 h-10 text-white/80 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Refer a Colleague, Get Rewarded</h3>
            <p className="text-white/90 mb-6 max-w-md">
              Invite fellow medical professionals to Dr Sales Direct and you both receive a reward on your next purchase.
            </p>
            <Link href="/referral" className={cn(buttonVariants(), 'bg-white text-[#ec6a82] hover:bg-gray-100 font-semibold')}>
              Know More About Our Referral Program
            </Link>
          </div>
        </div>
      </section>

      {/* ── BLOG ─────────────────────────────────────────────────────── */}
      {posts && posts.length > 0 && (
        <section className="bg-gray-50 border-y">
          <div className="max-w-7xl mx-auto px-4 py-14">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">From Our Blog</h2>
                <p className="text-gray-500 mt-2">Updates on medical news and discoveries.</p>
              </div>
              <Link href="/blog" className="text-sm text-[#ec6a82] hover:underline font-medium whitespace-nowrap">All posts →</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {posts.map(post => {
                const cover = post.image_url ?? blogImage(post.slug)
                return (
                <Link key={post.slug} href={`/blog/${post.slug}`}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-[16/9] bg-gradient-to-br from-[#ec6a82]/10 to-[#2a5a8c]/5 flex items-center justify-center overflow-hidden">
                    {cover ? (
                      <Image src={cover} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:768px) 100vw, 33vw" unoptimized />
                    ) : (
                      <Award className="w-10 h-10 text-[#ec6a82]/30" />
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-gray-400 mb-2">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                    </p>
                    <h3 className="font-semibold text-gray-800 group-hover:text-[#ec6a82] leading-snug mb-2">{post.title}</h3>
                    {post.excerpt && <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>}
                  </div>
                </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── CUSTOMER REVIEWS ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">What Our Customers Say</h2>
          <p className="text-gray-500 mt-2">Trusted by clinics, spas, and hospitals across the country.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map(r => (
            <div key={r.name} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: r.stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">&ldquo;{r.text}&rdquo;</p>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                <p className="text-xs text-gray-500">{r.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────── */}
      <section className="bg-[#ec6a82] text-white">
        <div className="max-w-4xl mx-auto px-4 py-14 text-center">
          <h2 className="text-3xl font-bold mb-3">Ready to Order at Wholesale Prices?</h2>
          <p className="text-white/80 mb-7 max-w-2xl mx-auto">
            We help doctors and busy medical professionals save time and money. Create your free
            account and start ordering from trusted manufacturers today.
          </p>
          <Link href="/auth/register" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-[#ec6a82] hover:bg-gray-100 font-semibold')}>
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  )
}
