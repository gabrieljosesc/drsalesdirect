import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Verification Policy' }

export default function VerificationPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Verification Policy</h1>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Who can purchase</h2>
        <p>
          Dr Sales Direct supplies medical and aesthetic products exclusively to
          <strong> licensed medical professionals and qualified facilities</strong> — physicians,
          nurse practitioners, dentists, clinics, medspas operating under medical direction, and
          accredited research organizations.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">License verification</h2>
        <p>
          During registration we collect your professional license number, issuing state or country,
          and expiry date. Before fulfilling a first order — and periodically thereafter — our team may:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Verify your license against official licensing board records</li>
          <li>Request a copy of your license or facility accreditation</li>
          <li>Confirm your practice or clinic details by phone or email</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Orders pending verification</h2>
        <p>
          Orders from unverified accounts are held in <em>pending review</em> status until verification
          is complete. We reserve the right to refuse or cancel any order where licensure cannot be
          confirmed, where products are restricted in the destination jurisdiction, or where we believe
          the purchase is not for legitimate professional use.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Keeping your details current</h2>
        <p>
          You are responsible for keeping your license information accurate and up to date in your
          account profile. Expired or inaccurate license details may delay order fulfillment.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Privacy</h2>
        <p>
          License information is used solely for verification and compliance purposes and is handled
          according to our <a href="/legal/privacy" className="text-[#ec6a82] hover:underline">Privacy Policy</a>.
        </p>
      </section>

      <p className="text-xs text-gray-400">Last updated: 2026</p>
    </article>
  )
}
