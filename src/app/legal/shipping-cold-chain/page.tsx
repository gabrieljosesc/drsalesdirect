import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Shipping & Cold Chain Policy' }

export default function ShippingColdChainPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Shipping &amp; Cold Chain Policy</h1>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Processing & dispatch</h2>
        <p>
          Orders are reviewed and confirmed by our team before fulfillment. Once payment is arranged,
          in-stock items typically dispatch within 1–3 business days. You will receive tracking
          information by email when your order ships.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Shipping rates</h2>
        <p>
          Your <strong>first order ships free</strong>. After that, shipping is{' '}
          <strong>free on orders of $795 or more</strong>, <strong>$50</strong> on orders of $498–$795,
          and <strong>$100</strong> on orders under $498 — always shown at checkout before you place the
          order.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Cold chain handling</h2>
        <p>
          Many injectables — including botulinum toxins and certain biologics — require continuous
          refrigerated storage from manufacturer to clinic. For these products we use:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Validated insulated shippers with gel packs or phase-change materials</li>
          <li>Expedited courier services to minimize transit time</li>
          <li>Seasonal packing adjustments for extreme temperatures</li>
        </ul>
        <p>
          Upon delivery, refrigerated products should be unpacked immediately and stored according to
          the manufacturer&rsquo;s instructions for use (IFU).
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Delivery responsibility</h2>
        <p>
          Please ensure someone is available to receive temperature-sensitive shipments. We are not
          responsible for product degradation caused by failed delivery attempts, packages left
          unattended at the customer&rsquo;s instruction, or delays caused by incorrect shipping details.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">International shipments</h2>
        <p>
          For international orders, the recipient is responsible for compliance with local import
          regulations and any applicable duties or taxes. Our team will advise on documentation
          requirements during order confirmation.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
        <p>
          Contact <a href="mailto:info@drsalesdirect.com" className="text-[#ec6a82] hover:underline">info@drsalesdirect.com</a> or
          +1-855-843-4782 for shipment-specific handling questions.
        </p>
      </section>

      <p className="text-xs text-gray-400">Last updated: 2026</p>
    </article>
  )
}
