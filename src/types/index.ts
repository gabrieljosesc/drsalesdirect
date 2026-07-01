export interface Category {
  id: string
  slug: string
  name: string
  description: string | null
  parent_id: string | null
  sort_order: number
  created_at: string
}

export interface PriceTier {
  minQ: number
  maxQ: number
  price: number
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  sort_order: number
}

export interface ProductCoa {
  label: string
  url: string
}

export interface Product {
  id: string
  slug: string
  title: string
  description: string | null
  category_id: string | null
  sku: string | null
  variant_product_id: number | null
  base_price: number
  price_tiers: PriceTier[]
  currency: string
  rating: number
  review_count: number
  is_active: boolean
  is_featured: boolean
  coa_url?: string | null
  coas?: ProductCoa[]
  created_at: string
  updated_at: string
  category?: Category
  images?: ProductImage[]
}

export interface CartItem {
  id: string
  product_id: string
  quantity: number
  product: Product
  /** Included in checkout. Defaults to true; older stored carts may omit it. */
  selected?: boolean
}

export interface Order {
  id: string
  user_id: string | null
  reference_number: string | null
  status: 'pending_csr' | 'confirmed' | 'shipped' | 'cancelled'
  email: string
  full_name: string
  phone: string | null
  shipping_address: ShippingAddress
  customer_notes: string | null
  subtotal: number
  coupon_code?: string | null
  discount_amount?: number
  shipping_amount?: number
  total?: number | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  title: string
  quantity: number
  unit_price: number
}

export interface ShippingAddress {
  first_name: string
  last_name: string
  company: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  company: string | null
  role: 'customer' | 'admin'
  created_at: string
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string
  published_at: string | null
  is_published: boolean
  created_at: string
}

export type SortOption = 'latest' | 'price_asc' | 'price_desc'

export interface ShopFilters {
  category?: string
  min_price?: number
  max_price?: number
  search?: string
  sort?: SortOption
  page?: number
}
