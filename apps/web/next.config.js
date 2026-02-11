/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@crush/ui', '@crush/core'],
  // Use Turbopack (Next.js 16 default)
  turbopack: {},

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
    // Optimize image quality and formats
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@crush/ui', 'lucide-react', 'framer-motion', 'date-fns'],
  },

  // Enable compression
  compress: true,

  // Production source maps for error tracking
  productionBrowserSourceMaps: false,

  // Power PWA support with offline capabilities
  poweredByHeader: false,

  // Redirects for common URL patterns
  async redirects() {
    return [
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/signup', destination: '/auth/signup', permanent: true },
      { source: '/register', destination: '/auth/signup', permanent: true },
      { source: '/chat', destination: '/messages', permanent: true },
      { source: '/chat/:matchId', destination: '/messages/:matchId', permanent: true },
      { source: '/dashboard', destination: '/discover', permanent: true },
      { source: '/download', destination: '/#download', permanent: false },
      { source: '/likes-you', destination: '/likes', permanent: true },
      { source: '/reset-password', destination: '/auth/forgot-password', permanent: true },
      { source: '/auth/reset-password', destination: '/auth/forgot-password', permanent: true },
      { source: '/verify', destination: '/auth/verify', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseio.com https://*.googleapis.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://*.stripe.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebase.google.com https://api.stripe.com https://firebasestorage.googleapis.com wss://*.firebaseio.com",
              "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
