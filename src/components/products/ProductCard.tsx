'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Heart } from 'lucide-react'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { useWishlist } from '@/hooks/useWishlist'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const { addToCart } = useCart()
  const { isWishlisted, toggle } = useWishlist()
  const imageUrl = product.images?.[0]?.url ?? null
  const showPrice = product.base_price > 0
  const wished = isWishlisted(product.id)

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    addToCart(product, 1)
    toast.success(`${product.title} added to cart`)
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    toggle(product)
    toast.success(wished ? `Removed from wishlist` : `${product.title} added to wishlist`)
  }

  return (
    <Link href={`/product/${product.slug}`} className="group">
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <ShoppingCart className="w-12 h-12" />
            </div>
          )}
          {/* Wishlist heart */}
          <button
            onClick={handleWishlist}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm transition-colors"
          >
            <Heart className={`w-4 h-4 ${wished ? 'fill-[#ec6a82] text-[#ec6a82]' : 'text-gray-400'}`} />
          </button>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug mb-2 group-hover:text-[#ec6a82] transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center justify-between">
            <div>
              {showPrice ? (
                <span className="text-base font-bold text-gray-800">{formatPrice(product.base_price)}</span>
              ) : (
                <span className="text-sm text-gray-400 italic">Contact for price</span>
              )}
            </div>
            {showPrice && (
              <Button
                size="sm"
                onClick={handleAddToCart}
                className="bg-[#ec6a82] hover:bg-[#d95672] text-white text-xs px-2.5 h-8"
              >
                Add
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
