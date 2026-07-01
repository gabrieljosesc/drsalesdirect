import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Returns & Cancellations' }

export default function ReturnsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Returns &amp; Cancellations</h1>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Order cancellations</h2>
        <p>
          Orders may be cancelled free of charge any time <strong>before payment is confirmed</strong> with
          your account manager. Because no payment is captured on the website, simply reply to your order
          confirmation email or call us to cancel.
        </p>
        <p>
          Once an order has been paid and dispatched, it can no longer be cancelled — see the return
          conditions below.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Return conditions</h2>
        <p>
          Due to the nature of medical and temperature-sensitive products, returns are accepted only when
          <strong> all</strong> of the following conditions are met:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>You contact us within <strong>48 hours of delivery</strong>.</li>
          <li>The product is unopened, unused, and in its original packaging with seals intact.</li>
          <li>For cold-chain products, the cold chain has demonstrably not been broken.</li>
          <li>The return is authorized in writing by our team before shipment back to us.</li>
        </ul>
        <p>
          Unauthorized returns will not be accepted or refunded.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Damaged, defective, or incorrect items</h2>
        <p>
          Please inspect your order immediately upon delivery. If an item arrives damaged, defective, or
          differs from what you ordered, contact us within <strong>48 hours</strong> with photos of the
          product and packaging. We will arrange a replacement or credit at no cost to you.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Non-returnable items</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Opened or used products</li>
          <li>Cold-chain products where temperature control cannot be verified</li>
          <li>Products marked as final sale or special order</li>
          <li>Research Use Only (RUO) products once dispatched</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Refunds</h2>
        <p>
          Approved refunds are issued to the original payment method within 5–10 business days of
          receiving and inspecting the returned items. Original shipping charges are non-refundable
          unless the return is due to our error.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">How to start a return</h2>
        <p>
          Email <a href="mailto:info@drsalesdirect.com" className="text-[#ec6a82] hover:underline">info@drsalesdirect.com</a> or
          call +1-855-843-4782 with your order reference number. Our team will confirm eligibility and
          provide return instructions.
        </p>
      </section>

      <p className="text-xs text-gray-400">Last updated: 2026</p>
    </article>
  )
}
