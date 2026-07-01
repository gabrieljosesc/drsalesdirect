import type { SupabaseClient } from '@supabase/supabase-js'
import type { Product } from '@/types'

const PRODUCT_SELECT =
  '*, category:categories(*), images:product_images(id,url,sort_order)'

export interface ShopProductFilters {
  search?: string
  category?: string
  min_price?: string
  max_price?: string
  sort?: string
  page?: number
  pageSize?: number
}

function buildProductQuery(supabase: SupabaseClient, filters: ShopProductFilters, categoryId?: string) {
  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('is_active', true)

  if (filters.search) query = query.ilike('title', `%${filters.search}%`)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (filters.min_price) query = query.gte('base_price', parseFloat(filters.min_price))
  if (filters.max_price) query = query.lte('base_price', parseFloat(filters.max_price))

  return query
}

function applySort(
  query: ReturnType<typeof buildProductQuery>,
  sort: string,
) {
  switch (sort) {
    case 'price_asc':
      return query.order('base_price', { ascending: true })
    case 'price_desc':
      return query.order('base_price', { ascending: false })
    default:
      return query.order('created_at', { ascending: false })
  }
}

async function peptidesCategoryId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from('categories').select('id').eq('slug', 'peptides').single()
  return data?.id ?? null
}

function buildCountQuery(supabase: SupabaseClient, filters: ShopProductFilters) {
  let query = supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  if (filters.search) query = query.ilike('title', `%${filters.search}%`)
  if (filters.min_price) query = query.gte('base_price', parseFloat(filters.min_price))
  if (filters.max_price) query = query.lte('base_price', parseFloat(filters.max_price))

  return query
}

async function fetchBucket(
  supabase: SupabaseClient,
  filters: ShopProductFilters,
  options: { excludePeptides?: boolean; peptidesOnly?: boolean; range: [number, number] },
) {
  const peptidesId = await peptidesCategoryId(supabase)
  let query = buildProductQuery(supabase, filters)

  if (options.excludePeptides && peptidesId) query = query.neq('category_id', peptidesId)
  if (options.peptidesOnly && peptidesId) query = query.eq('category_id', peptidesId)

  query = applySort(query, filters.sort ?? 'latest')
  return query.range(options.range[0], options.range[1])
}

/** List shop products with peptides deferred to the end when viewing all products. */
export async function fetchShopProducts(
  supabase: SupabaseClient,
  filters: ShopProductFilters,
): Promise<{ products: Product[]; count: number }> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = filters.pageSize ?? 20
  const sort = filters.sort ?? 'latest'
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  let categoryId: string | undefined
  if (filters.category) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filters.category)
      .single()
    categoryId = cat?.id
  }

  const peptidesId = await peptidesCategoryId(supabase)
  const deferPeptides = !categoryId && !!peptidesId

  if (!deferPeptides) {
    let query = buildProductQuery(supabase, filters, categoryId)
    query = applySort(query, sort)
    const { data, count } = await query.range(start, end)
    return { products: (data as Product[]) ?? [], count: count ?? 0 }
  }

  const [{ count: nonPeptidesCount }, { count: peptidesCount }] = await Promise.all([
    buildCountQuery(supabase, filters).neq('category_id', peptidesId!),
    buildCountQuery(supabase, filters).eq('category_id', peptidesId!),
  ])

  const nonPeptideTotal = nonPeptidesCount ?? 0
  const peptideTotal = peptidesCount ?? 0
  const total = nonPeptideTotal + peptideTotal
  const products: Product[] = []

  if (start < nonPeptideTotal) {
    const nonPeptideEnd = Math.min(end, nonPeptideTotal - 1)
    const { data } = await fetchBucket(supabase, { ...filters, sort }, {
      excludePeptides: true,
      range: [start, nonPeptideEnd],
    })
    if (data) products.push(...(data as Product[]))

    const remaining = pageSize - products.length
    if (remaining > 0 && peptideTotal > 0) {
      const { data: peptideData } = await fetchBucket(supabase, { ...filters, sort }, {
        peptidesOnly: true,
        range: [0, remaining - 1],
      })
      if (peptideData) products.push(...(peptideData as Product[]))
    }
  } else {
    const peptideStart = start - nonPeptideTotal
    const peptideEnd = peptideStart + pageSize - 1
    const { data } = await fetchBucket(supabase, { ...filters, sort }, {
      peptidesOnly: true,
      range: [peptideStart, peptideEnd],
    })
    if (data) products.push(...(data as Product[]))
  }

  return { products, count: total }
}
