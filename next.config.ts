import type { NextConfig } from "next";

// Allow images from whichever Supabase project .env points at
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'localhost';

const nextConfig: NextConfig = {
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
