'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, ExternalLink, Minus, Plus, ShoppingCart } from 'lucide-react'
import { Product } from '@/types'
import type { DoseOption } from '@/lib/peptide-doses'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { parsePriceTiers, unitPriceForQuantity, tierQuantityLabel } from '@/lib/price-tiers'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function ProductDetail({ product, doseOptions = [] }: { product: Product; doseOptions?: DoseOption[] }) {
  const { addToCart } = useCart()
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)

  const images = product.images ?? []
  const tiers = parsePriceTiers(product.price_tiers)
  const showPrice = product.base_price > 0 || tiers.length > 0

  const unitPrice = unitPriceForQuantity(tiers, qty, product.base_price)
  const lineTotal = unitPrice * qty

  function handleAdd() {
    addToCart(product, qty)
    toast.success(`${qty}× ${product.title} added to cart`)
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-[#ec6a82]">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/shop" className="hover:text-[#ec6a82]">Shop</Link>
        {product.category && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/shop/${product.category.slug}`} className="hover:text-[#ec6a82]">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 truncate max-w-[200px]">{product.title}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div>
          <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden border mb-3">
            {images[activeImg]?.url ? (
              <Image
                src={images[activeImg].url}
                alt={product.title}
                fill
                className="object-contain p-6"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-200">
                <ShoppingCart className="w-20 h-20" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(i)}
                  className={`relative w-16 h-16 rounded-lg border-2 overflow-hidden flex-shrink-0 ${
                    activeImg === i ? 'border-[#ec6a82]' : 'border-gray-200'
                  }`}
                >
                  <Image src={img.url} alt="" fill className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <Link
              href={`/shop/${product.category.slug}`}
              className="text-sm text-blue-600 hover:underline font-medium uppercase tracking-wide"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mt-1 mb-4 leading-snug">{product.title}</h1>

          {/* Dose selector (peptides at multiple strengths) */}
          {doseOptions.length > 1 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Dose</p>
              <div className="flex flex-wrap gap-2">
                {doseOptions.map(opt =>
                  opt.current ? (
                    <span
                      key={opt.slug}
                      aria-current="true"
                      className="rounded-lg border-2 border-[#ec6a82] bg-[#ec6a82] px-3.5 py-1.5 text-sm font-semibold text-white"
                    >
                      {opt.dose}
                    </span>
                  ) : (
                    <Link
                      key={opt.slug}
                      href={`/product/${opt.slug}`}
                      className="rounded-lg border-2 border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#ec6a82] hover:text-[#ec6a82]"
                    >
                      {opt.dose}
                    </Link>
                  )
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            {showPrice ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{formatPrice(unitPrice)}</span>
                <span className="text-sm text-gray-400">/ unit</span>
              </div>
            ) : (
              <span className="text-xl text-gray-500 italic">Contact us for pricing</span>
            )}
            {showPrice && tiers.length > 1 && (
              <p className="text-xs text-gray-500 mt-1">Unit price updates with the quantity you choose.</p>
            )}
          </div>

          {/* Volume pricing table */}
          {tiers.length > 0 && (
            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/80 overflow-hidden">
              <p className="border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Volume Pricing
              </p>
              <ul className="divide-y divide-gray-200">
                {tiers.map((t, i) => {
                  const active = qty >= t.minQ && qty <= t.maxQ
                  return (
                    <li
                      key={`${t.minQ}-${t.maxQ}-${i}`}
                      className={`flex items-center justify-between px-3 py-2 text-sm ${
                        active ? 'bg-blue-50 text-[#ec6a82] font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span>{tierQuantityLabel(t)}</span>
                      <span className="tabular-nums">{formatPrice(t.price)} <span className="text-gray-400 font-normal">/ unit</span></span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <Separator className="my-4" />

          {showPrice && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center border rounded-md">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  size="lg"
                  onClick={handleAdd}
                  className="flex-1 bg-[#ec6a82] hover:bg-[#d95672] gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </Button>
              </div>
              {qty > 1 && (
                <p className="text-sm text-gray-600 mb-4">
                  {qty} × {formatPrice(unitPrice)} ={' '}
                  <span className="font-semibold text-gray-900">{formatPrice(lineTotal)}</span>
                </p>
              )}
            </>
          )}

          {!showPrice && (
            <Link
              href="/contact"
              className="inline-block px-6 py-3 bg-[#ec6a82] text-white rounded-lg font-medium hover:bg-[#d95672] transition-colors mb-4"
            >
              Request Pricing
            </Link>
          )}

          {product.sku && (
            <p className="text-xs text-gray-400 mb-4">SKU: {product.sku}</p>
          )}

          <div className="mt-4 bg-blue-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
            <p>✓ Authentic products guaranteed</p>
            <p>✓ Licensed professionals only</p>
            <p>✓ Team contacts you within 24 hrs to confirm payment & shipping</p>
          </div>

          {product.coas && product.coas.length > 0 && (
            <div className="mt-6">
              <h3 className="text-base font-bold text-gray-900">Certificate of Analysis</h3>
              <p className="mt-1 text-sm text-gray-500">
                Third-party lab reports (opens in a new tab).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.coas.map((coa) => (
                  <a
                    key={coa.url}
                    href={coa.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#3d7a7a] bg-white px-4 py-2 text-sm font-medium text-[#2d5f5f] transition-colors hover:bg-[#f0f7f7]"
                  >
                    {coa.label}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Product Description</h2>
          <div
            className="prose prose-gray max-w-none text-sm leading-relaxed whitespace-pre-wrap"
          >
            {product.description}
          </div>
        </div>
      )}
    </div>
  )
}
