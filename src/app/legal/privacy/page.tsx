import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-gray max-w-none text-gray-700 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold text-gray-900 not-prose mb-6">Privacy Policy</h1>
      <p>Dr Sales Direct respects your privacy. This policy explains what information we collect and how we use it.</p>
      <h2 className="text-lg font-semibold text-gray-900 mt-6">Information We Collect</h2>
      <p>We collect the information you provide when registering and ordering — including your name, contact details, professional license information, company, and shipping address — to verify eligibility and fulfill orders.</p>
      <h2 className="text-lg font-semibold text-gray-900 mt-6">How We Use It</h2>
      <p>Your information is used to process and confirm orders, verify professional credentials, provide support, and (with your consent) send service and product updates. We do not sell your personal information.</p>
      <h2 className="text-lg font-semibold text-gray-900 mt-6">Data Security</h2>
      <p>We use industry-standard safeguards to protect your data. Any saved payment card numbers are encrypted at rest and accessible only to authorized staff for order processing.</p>
      <h2 className="text-lg font-semibold text-gray-900 mt-6">Contact</h2>
      <p>Questions? Email <a href="mailto:info@drsalesdirect.com" className="text-[#ec6a82] hover:underline">info@drsalesdirect.com</a>.</p>
    </div>
  )
}
