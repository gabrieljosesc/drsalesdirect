'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { useWishlist } from '@/hooks/useWishlist'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function WishlistPage() {
  const { items, remove } = useWishlist()
  const { addToCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your wishlist is empty</h1>
        <p className="text-gray-500 mb-6">Tap the heart on any product to save it here.</p>
        <Link href="/shop" className={cn(buttonVariants(), 'bg-[#ec6a82] hover:bg-[#d95672]')}>
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Wishlist <span className="text-gray-400 font-normal text-lg">({items.length})</span></h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(product => {
          const imageUrl = product.images?.[0]?.url ?? null
          const showPrice = product.base_price > 0
          return (
            <div key={product.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden flex flex-col">
              <Link href={`/product/${product.slug}`} className="group relative aspect-square bg-gray-50 block">
                {imageUrl ? (
                  <Image src={imageUrl} alt={product.title} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-300" sizes="(max-width:640px) 50vw, 25vw" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300"><ShoppingCart className="w-12 h-12" /></div>
                )}
                <button
                  onClick={(e) => { e.preventDefault(); remove(product.id); toast.success('Removed from wishlist') }}
                  aria-label="Remove"
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-sm transition-colors text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Link>
              <div className="p-3 flex flex-col flex-1">
                <Link href={`/product/${product.slug}`} className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug mb-2 hover:text-[#ec6a82]">
                  {product.title}
                </Link>
                <div className="mt-auto flex items-center justify-between">
                  {showPrice
                    ? <span className="text-base font-bold text-gray-800">{formatPrice(product.base_price)}</span>
                    : <span className="text-xs text-gray-400 italic">Contact for price</span>}
                  {showPrice && (
                    <Button
                      size="sm"
                      onClick={() => { addToCart(product, 1); toast.success(`${product.title} added to cart`) }}
                      className="bg-[#ec6a82] hover:bg-[#d95672] text-white text-xs px-2.5 h-8"
                    >
                      Add
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
