import withBundleAnalyzer from '@next/bundle-analyzer';

const analyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  async redirects() {
    return [
      { source: '/book', destination: '/booking', permanent: true },
      { source: '/reserve', destination: '/booking', permanent: true },
      { source: '/reservations', destination: '/booking', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com https://web.squarecdn.com https://sandbox.web.squarecdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://linapoint.com https://seonmgpsyyzbpcsrzjxi.supabase.co https://q.stripe.com; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.openai.com https://api.stripe.com https://api.resend.com https://vitals.vercel-insights.com https://connect.squareup.com https://connect.squareupsandbox.com https://*.squareup.com; frame-src https://js.stripe.com https://hooks.stripe.com https://connect.squareup.com https://connect.squareupsandbox.com; frame-ancestors 'none';",

          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'linapoint.com',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'seonmgpsyyzbpcsrzjxi.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default analyzer(nextConfig);