import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-gray max-w-none text-gray-700 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold text-gray-900 not-prose mb-6">Terms of Service</h1>
      <p>By using Dr Sales Direct, you agree to these terms.</p>
      <h2 className="text-lg font-semibold text-gray-900 mt-6">Eligibility</h2>
      <p>Products are sold exclusively to qualified, licensed medical professionals. You confirm that your license information is accurate and current and that you are authorized to purchase regulated medical and aesthetic supplies.</p>
      <h2 className="text-lg font-semibold text-gray-900 mt-6">Orders &amp; Payment</h2>
      <p>Placing an order online creates a request that our team confirms before fulfillment. No payment is captured on the website; our team contacts you to arrange payment and shipping. Prices may change at any time before billing.</p>
      <h2 className="text-lg font-semibold text-gray-900 mt-6">Product Information</h2>
      <p>Information is provided for reference only and may not cover all precautions or side effects. All brand names and images belong to their respective owners; Dr Sales Direct is not affiliated with the manufacturers of these products.</p>
      <h2 className="text-lg font-semibold text-gray-900 mt-6">Contact</h2>
      <p>Questions? Email <a href="mailto:info@drsalesdirect.com" className="text-[#ec6a82] hover:underline">info@drsalesdirect.com</a>.</p>
    </div>
  )
}
