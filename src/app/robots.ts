import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep private / transactional areas out of the index
      disallow: ['/account', '/admin', '/checkout', '/cart', '/auth', '/api'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
