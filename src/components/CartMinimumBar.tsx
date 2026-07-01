'use client'

import { meetsCheckoutMinimumUsd, MIN_CHECKOUT_SUBTOTAL_USD } from '@/lib/cart-minimum'
import { formatPrice } from '@/lib/utils'

type Props = {
  /** Selected-line subtotal used toward the minimum (same basis as checkout). */
  amountUsd: number
  className?: string
}

export function CartMinimumBar({ amountUsd, className = '' }: Props) {
  const min = MIN_CHECKOUT_SUBTOTAL_USD
  const pct = Math.min(100, Math.max(0, (amountUsd / min) * 100))
  const remaining = Math.max(0, min - amountUsd)
  const met = meetsCheckoutMinimumUsd(amountUsd)

  return (
    <div className={`mx-auto w-full ${className}`}>
      <div className="mx-auto max-w-xs px-1">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={
            met
              ? `Minimum order reached (${formatPrice(amountUsd)} of ${formatPrice(min)})`
              : `${formatPrice(amountUsd)} of ${formatPrice(min)} toward minimum order`
          }
        >
          <div
            className="h-full rounded-full bg-[#ec6a82] transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="mt-2 px-1">
        <p className="text-center text-xs leading-snug text-gray-600">
          {met ? (
            <>
              Minimum order of <span className="font-semibold text-[#ec6a82]">{formatPrice(min)}</span> reached.
              You can proceed to checkout.
            </>
          ) : (
            <>
              Add <span className="font-semibold text-[#ec6a82]">{formatPrice(remaining)}</span> more to place
              your order <span className="text-gray-400">(minimum {formatPrice(min)})</span>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
