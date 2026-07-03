import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Research Use Only Policy' }

export default function ResearchUseOnlyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Research Use Only Policy</h1>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Intended use</h2>
        <p>
          Products designated as Research Use Only (RUO) are intended solely for laboratory research,
          analytical testing, and in vitro research applications.
        </p>
        <p>
          RUO products are <strong>not</strong> intended for human use, veterinary use, clinical use,
          therapeutic use, or diagnostic use.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Purchaser representations</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>You are of legal age in your jurisdiction to place this order.</li>
          <li>You are purchasing for legitimate research or professional purposes.</li>
          <li>You understand the handling requirements of RUO materials.</li>
          <li>You will not use RUO products for human consumption, animal consumption, or clinical application.</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">FDA statement</h2>
        <p>
          Statements made on this website have not been evaluated by the U.S. Food and Drug
          Administration. Products sold under RUO designation are not intended to diagnose, treat,
          cure, or prevent any disease.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Purchaser responsibility</h2>
        <p>
          The purchaser assumes full responsibility for proper handling, storage, and use of all
          products. Dr Sales Direct is not liable for misuse, improper handling, or
          application that is inconsistent with the RUO designation.
        </p>
      </section>

      <section className="space-y-2 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-gray-900">Order review and refusal</h2>
        <p>
          We reserve the right to review, hold, refuse, or cancel orders at our sole discretion if we
          believe a purchase may not align with RUO requirements, compliance obligations, or local
          regulations.
        </p>
      </section>

      <p className="text-xs text-gray-400">Last updated: 2026</p>
    </article>
  )
}
