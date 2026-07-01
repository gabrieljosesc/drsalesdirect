import type { Metadata } from 'next'
import { Truck, ThermometerSnowflake, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Shipping Policy' }

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Shipping Policy</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {[
          { icon: Truck, t: 'Free over $795', d: 'First order free · $50 on $498+ · $100 under $498.' },
          { icon: ThermometerSnowflake, t: 'Cold chain', d: 'Validated insulated packaging for sensitive items.' },
          { icon: ShieldCheck, t: 'Safe delivery', d: 'Tracked, insured, and securely packed.' },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-xl border border-gray-100 bg-white p-5 text-center">
            <Icon className="w-7 h-7 text-[#ec6a82] mx-auto mb-2" />
            <h3 className="font-semibold text-gray-800 text-sm">{t}</h3>
            <p className="text-xs text-gray-500 mt-1">{d}</p>
          </div>
        ))}
      </div>

      <div className="prose prose-gray max-w-none text-gray-700 text-sm leading-relaxed space-y-4">
        <p>Orders are processed after our team confirms payment and shipping details with you, typically within 24 business hours of checkout.</p>
        <p>Your first order ships free. After that, shipping is free on orders of $795 or more, $50 on orders of $498–$795, and $100 on orders under $498.</p>
        <p>Temperature-sensitive products (such as viscosupplements and certain injectables) are shipped using validated cold-chain packaging to preserve product integrity in line with manufacturer instructions.</p>
        <p>For questions about a specific shipment, contact us at <a href="mailto:info@drsalesdirect.com" className="text-[#ec6a82] hover:underline">info@drsalesdirect.com</a> or call +1-855-843-4782.</p>
      </div>
    </div>
  )
}
