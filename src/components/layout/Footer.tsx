import Link from 'next/link'
import Image from 'next/image'
import { Phone, Printer, Mail, Clock, ShieldCheck } from 'lucide-react'

// Compact by design (client request): no Account/Shop columns (both live in
// the header), payment badges inline, short disclaimer, thin copyright.

const infoLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Shipping Policy', href: '/shipping' },
  { label: 'Referral Program', href: '/referral' },
  { label: 'Blog', href: '/blog' },
]

const policyLinks = [
  { label: 'Returns & Cancellations', href: '/legal/returns' },
  { label: 'Shipping & Cold Chain', href: '/legal/shipping-cold-chain' },
  { label: 'Verification Policy', href: '/legal/verification-policy' },
  { label: 'Research Use Only', href: '/legal/research-use-only' },
]

function PaymentBadges() {
  const chip = 'flex items-center justify-center h-6 min-w-[42px] px-2 rounded bg-white shadow-sm'
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className={chip}><span className="text-[#1a1f71] font-bold italic text-xs tracking-tight">VISA</span></div>
      <div className={chip}>
        <span className="relative inline-flex items-center">
          <span className="w-3 h-3 rounded-full bg-[#eb001b]" />
          <span className="w-3 h-3 rounded-full bg-[#f79e1b] -ml-1.5 mix-blend-multiply" />
        </span>
      </div>
      <div className="flex items-center justify-center h-6 min-w-[42px] px-2 rounded bg-[#006fcf] shadow-sm">
        <span className="text-white font-bold text-[10px] tracking-wide">AMEX</span>
      </div>
      <div className={chip}><span className="font-medium text-xs text-gray-700"><span className="text-[#4285F4]">G</span> Pay</span></div>
      <div className={chip}><span className="font-medium text-xs text-gray-800"> Pay</span></div>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="bg-[#ec6a82] text-white mt-12">
      {/* Main row: brand + links */}
      <div className="mx-auto max-w-7xl px-4 py-7 grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="inline-block rounded-xl bg-white px-4 py-2">
            <Image src="/logo.png" alt="Dr Sales Direct" width={560} height={197} unoptimized className="h-10 w-auto" />
          </div>
          <p className="mt-3 max-w-sm text-sm leading-snug text-white/85">
            Wholesale medical supplies for licensed professionals — sourced from
            trusted manufacturers, shipped with validated cold-chain packaging.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <PaymentBadges />
            <span className="inline-flex items-center gap-1 text-[11px] text-white/80">
              <ShieldCheck className="h-3.5 w-3.5" /> PCI DSS–compliant
            </span>
          </div>
        </div>

        <div>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-rose-100">Information</h3>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 md:grid-cols-1">
            {infoLinks.map(l => (
              <li key={l.href}><Link href={l.href} className="text-sm text-white/85 hover:text-white transition-colors">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-rose-100">Policies</h3>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 md:grid-cols-1">
            {policyLinks.map(l => (
              <li key={l.href}><Link href={l.href} className="text-sm text-white/85 hover:text-white transition-colors">{l.label}</Link></li>
            ))}
          </ul>
        </div>
      </div>

      {/* Contact strip */}
      <div className="border-t border-white/15">
        <div className="mx-auto max-w-7xl px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/85">
          <a href="tel:+18558434782" className="inline-flex items-center gap-1.5 hover:text-white"><Phone className="h-3.5 w-3.5" />+1-855-843-4782</a>
          <span className="inline-flex items-center gap-1.5"><Printer className="h-3.5 w-3.5" />Fax +1-844-611-8975</span>
          <a href="mailto:info@drsalesdirect.com" className="inline-flex items-center gap-1.5 hover:text-white break-all"><Mail className="h-3.5 w-3.5" />info@drsalesdirect.com</a>
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Mon – Fri / 9:00 AM – 6:00 PM EST</span>
        </div>
      </div>

      {/* Disclaimer + copyright */}
      <div className="border-t border-white/15">
        <div className="mx-auto max-w-7xl px-4 py-2.5">
          <p className="text-[10px] leading-relaxed text-white/60">
            Product information is provided for reference only. All brand names and images belong to
            their respective owners; Dr Sales Direct is not affiliated with the manufacturers.
            Products are intended for purchase and use by qualified, licensed medical practitioners only.
          </p>
          <div className="mt-1.5 flex flex-col gap-1 text-[11px] text-white/70 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Dr Sales Direct. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
