import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { Product } from '@/types'
import { getProductCoas } from '@/lib/coa'
import { getDoseSiblings } from '@/lib/peptide-doses'
import ProductDetail from '@/components/products/ProductDetail'
import ProductCard from '@/components/products/ProductCard'
import { ProductReviews } from '@/components/products/ProductReviews'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('title, description')
    .eq('slug', slug)
    .single()
  if (!data) return {}
  return {
    title: data.title,
    description: data.description?.slice(0, 160) ?? undefined,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(id,url,sort_order)')
    .eq('slug', slug)
    .single()

  if (!product) notFound()

  // Peptides encode dose in the title; offer other strengths of the same peptide
  const doseOptions = product.category?.slug === 'peptides'
    ? await getDoseSiblings(supabase, product)
    : []

  const { data: related } = await supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(id,url,sort_order)')
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .eq('is_dose_primary', true)
    .neq('id', product.id)
    .limit(4)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ProductDetail
        product={{
          ...(product as Product),
          coas: getProductCoas(slug, product.coa_url),
        }}
        doseOptions={doseOptions}
      />

      <ProductReviews productId={product.id} slug={slug} />

      {related && related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(related as Product[]).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
