import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'FAQ' }

const faqs = [
  { q: 'Who can order from Dr Sales Direct?', a: 'We supply licensed medical professionals, clinics, spas, and hospitals only. A valid professional license is required during registration.' },
  { q: 'How does payment work?', a: 'After you place an order online, our team contacts you within 24 business hours to confirm payment and shipping. No payment is captured on the website.' },
  { q: 'Do you offer free shipping?', a: 'Yes — your first order always ships free. After that, shipping is free on orders of $795 or more, $50 on orders of $498–$795, and $100 on orders under $498.' },
  { q: 'Are your products authentic?', a: 'All products are sourced directly from trusted, original manufacturers and are guaranteed authentic.' },
  { q: 'How are temperature-sensitive products shipped?', a: 'Cold-chain items are shipped in validated insulated packaging to maintain the manufacturer-required temperature range.' },
  { q: 'Can I see my order history?', a: 'Yes. Once signed in, visit your account to view all past orders and their status.' },
]

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
      <p className="text-gray-500 mb-8">Everything you need to know about ordering with us.</p>
      <div className="space-y-4">
        {faqs.map(f => (
          <details key={f.q} className="group rounded-xl border border-gray-200 bg-white p-5">
            <summary className="cursor-pointer font-semibold text-gray-800 list-none flex justify-between items-center">
              {f.q}
              <span className="text-[#ec6a82] group-open:rotate-45 transition-transform text-xl leading-none">+</span>
            </summary>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
