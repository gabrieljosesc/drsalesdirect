import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { Product } from '@/types'
import ProductCard from '@/components/products/ProductCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FlaskConical, FileCheck2, Truck, ShieldCheck, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Research Peptides',
  description: 'High-purity research peptides with third-party certificates of analysis. For research use only.',
}

const FEATURES = [
  { icon: FileCheck2, title: 'Third-Party Tested', desc: 'A certificate of analysis is available on every peptide product page.' },
  { icon: FlaskConical, title: 'High Purity', desc: 'Sourced for consistency and quality you can rely on in the lab.' },
  { icon: Truck, title: 'Fast, Tracked Shipping', desc: 'Discreet, tracked delivery — first order ships free.' },
  { icon: ShieldCheck, title: 'Research Use Only', desc: 'Not for human or veterinary use. Sold for laboratory research only.' },
]

export default async function PeptidesPage() {
  const supabase = createAdminClient()

  const { data: cat } = await supabase.from('categories').select('id').eq('slug', 'peptides').single()
  const { data: products } = cat
    ? await supabase
        .from('products')
        .select('*, category:categories(*), images:product_images(id,url,sort_order)')
        .eq('category_id', cat.id)
        .eq('is_active', true)
        .eq('is_dose_primary', true) // one card per multi-strength family
        .order('title')
    : { data: [] as Product[] }

  const items = (products as Product[]) ?? []

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#13243a]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2438] via-[#16314c] to-[#2a5a8c]/40" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 lg:py-20 text-white">
          <p className="inline-flex items-center gap-2 text-blue-200 text-xs font-semibold tracking-widest uppercase mb-4 bg-white/10 rounded-full px-3 py-1">
            <FlaskConical className="w-3.5 h-3.5" /> Research Peptides
          </p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4 max-w-3xl">
            High-Purity Research Peptides, Backed by Certificates of Analysis
          </h1>
          <p className="text-white/85 text-lg max-w-2xl mb-8">
            A growing catalog of research peptides — each with third-party lab documentation available
            on its product page. For laboratory research use only.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#catalog" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-[#ec6a82] hover:bg-gray-100 font-semibold gap-2')}>
              Browse the Catalog <ArrowRight className="w-4 h-4" />
            </a>
            <Link href="/legal/research-use-only" className={cn(buttonVariants({ size: 'lg' }), 'bg-transparent border border-white text-white hover:bg-white hover:text-[#ec6a82] font-semibold')}>
              Research-Use Policy
            </Link>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
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

      {/* Catalog */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 py-12 scroll-mt-24">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Peptide Catalog</h2>
            <p className="text-gray-500 mt-1">{items.length} products — many available in multiple doses.</p>
          </div>
          <Link href="/shop/peptides" className="text-sm text-[#ec6a82] hover:underline font-medium whitespace-nowrap">
            Open in shop →
          </Link>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <p className="text-center py-16 text-gray-400">Catalog coming soon.</p>
        )}

        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>For research use only.</strong> These products are not intended for human or veterinary
          use, diagnosis, treatment, or cure of any condition. By purchasing you confirm you are a
          qualified researcher. See our{' '}
          <Link href="/legal/research-use-only" className="underline hover:no-underline">research-use policy</Link>.
        </p>
      </section>
    </div>
  )
}
