import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export type SearchSuggestion = {
  id: string
  slug: string
  title: string
  base_price: number
  image: string | null
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  const svc = createAdminClient()
  const { data, error } = await svc
    .from('products')
    .select('id, slug, title, base_price, product_images(url, sort_order)')
    .eq('is_active', true)
    .ilike('title', `%${q}%`)
    .order('is_featured', { ascending: false })
    .limit(8)

  if (error) {
    console.error('[search-suggest]', error.message)
    return NextResponse.json({ suggestions: [] })
  }

  const suggestions: SearchSuggestion[] = (data ?? []).map(p => {
    const imgs = Array.isArray(p.product_images) ? p.product_images : []
    const first = [...imgs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      base_price: Number(p.base_price),
      image: first?.url ?? null,
    }
  })

  return NextResponse.json(
    { suggestions },
    { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } }
  )
}
