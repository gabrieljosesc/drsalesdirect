import type { NextConfig } from "next";

// Allow images from whichever Supabase project .env points at
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'localhost';

// Old WooCommerce /product-category/<slug>/ URLs -> new /shop/<slug>.
// Product URLs (/product/<slug>) are unchanged, so they need no redirect.
const CATEGORY_REDIRECTS: Record<string, string> = {
  'anaesthetics': '/shop/anaesthetics',
  'arthritis': '/shop/rheumatology',
  'best-sellers': '/shop',
  'body-sculpting': '/shop/body-sculpting',
  'botulinum-toxins': '/shop/botulinum-toxins',
  'creams-and-serums': '/shop/skincare',
  'crohns-disease-and-ulcerative-colitis-2': '/shop/other',
  'dermal-fillers-wholesale': '/shop/dermal-fillers',
  'dermatology': '/shop',
  'fat-removal': '/shop/fat-removal',
  'featured-products': '/shop',
  'filler-removal': '/shop/dermal-filler-removal',
  'gynecology': '/shop/gynecology',
  'inflammatory-bowel-disease': '/shop/other',
  'laser-accessories': '/shop/other',
  'mesotherapy': '/shop/mesotherapy',
  'multiple-sclerosis': '/shop/other',
  'needles-and-cannulas': '/shop/cannulas-and-needles',
  'ophthalmology': '/shop/ophthalmology',
  'orthopaedic': '/shop/orthopedic-injections',
  'osteoporosis': '/shop/osteoporosis',
  'peels-and-masks': '/shop/peels-and-masks',
  'prp-kits': '/shop/prp-kits',
  'psoriasis-and-psoriatic-arthritis': '/shop/other',
  'rheumatoid-arthritis': '/shop/rheumatology',
  'rheumatology': '/shop/rheumatology',
  'skincare': '/shop/skincare',
  'thread-lifts': '/shop/threads',
  'vaccines-and-immunology': '/shop/other',
  'weight-loss': '/shop/weight-loss',
  'weight-management': '/shop/weight-loss',
};

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...Object.entries(CATEGORY_REDIRECTS).map(([slug, destination]) => ({
        source: `/product-category/${slug}`,
        destination,
        permanent: true,
      })),
      // Any remaining old product-category URL falls back to the shop
      { source: '/product-category/:slug*', destination: '/shop', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'purechainresearch.com',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'medicaplanet.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'drsalesdirect.com',
        pathname: '/wp-content/**',
      },
    ],
  },
};

export default nextConfig;
