import { ShieldCheck, Truck, HeadphonesIcon, Award, Globe } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'About Us',
  description: 'Learn about Dr Sales Direct — an international medical supplier serving professionals since 2012.',
}

export default function AboutPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-[#ec6a82] to-[#2a5a8c] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">About Dr Sales Direct</h1>
          <p className="text-white/80 text-lg">
            International medical supplier serving doctors, clinics, spas, and hospitals since 2012.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Dr Sales Direct was established in 2012 with a single purpose: to be a source of the highest-quality
            medical products to each and every medical professional around the globe. We believe that every clinic —
            whether a large established institution or a small medical office — deserves access to authentic products at
            fair wholesale prices.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We eliminate the time-consuming sourcing process by maintaining a curated inventory from trusted manufacturers,
            offering tiered discount pricing and a hassle-free 24/7 purchasing experience.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Why Choose Us</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, title: 'Authentic Products', desc: 'Every product we sell is guaranteed legit and authentic, sourced directly from trusted manufacturers.' },
              { icon: Truck, title: 'Free Shipping', desc: 'Your first order ships free, and shipping stays complimentary on all orders over $795.' },
              { icon: HeadphonesIcon, title: '24/7 Support', desc: 'Our customer service team is online around the clock to assist with any questions.' },
              { icon: Globe, title: 'Global Reach', desc: 'We ship internationally, serving medical professionals in clinics and hospitals worldwide.' },
              { icon: Award, title: 'Since 2012', desc: 'Over a decade of trusted service — our track record speaks for itself.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-white rounded-xl border p-5">
                <div className="w-10 h-10 rounded-lg bg-[#ec6a82]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#ec6a82]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <Link href="/shop" className={cn(buttonVariants({ size: 'lg' }), 'bg-[#ec6a82] hover:bg-[#d95672]')}>
            Browse Our Products
          </Link>
        </div>
      </div>
    </div>
  )
}
