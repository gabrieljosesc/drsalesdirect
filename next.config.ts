import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'iebpxtbrcsbgadwyrqqi.supabase.co',
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
