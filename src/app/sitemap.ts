import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()

  const staticRoutes = [
    '', '/shop', '/peptides', '/about', '/contact', '/blog', '/faq',
    '/shipping', '/referral',
    '/legal/privacy', '/legal/terms', '/legal/returns',
    '/legal/shipping-cold-chain', '/legal/verification-policy',
    '/legal/research-use-only',
    '/auth/login', '/auth/register',
  ].map(path => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: (path === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: path === '' ? 1 : 0.6,
  }))

  const supabase = createAdminClient()

  const [{ data: categories }, { data: products }, { data: posts }] = await Promise.all([
    supabase.from('categories').select('slug').order('sort_order'),
    supabase.from('products').select('slug, updated_at').eq('is_active', true),
    supabase.from('blog_posts').select('slug, updated_at').eq('is_published', true),
  ])

  const categoryRoutes = (categories ?? []).map(c => ({
    url: `${base}/shop/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const productRoutes = (products ?? []).map(p => ({
    url: `${base}/product/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const blogRoutes = (posts ?? []).map(p => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes]
}
