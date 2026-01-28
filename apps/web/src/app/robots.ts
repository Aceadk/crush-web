import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crush.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/verify/',
          '/onboarding/',
          '/discover/',
          '/matches/',
          '/messages/',
          '/profile/edit/',
          '/settings/',
          '/premium/',
          '/_next/',
          '/static/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/verify/',
          '/onboarding/',
          '/discover/',
          '/matches/',
          '/messages/',
          '/profile/edit/',
          '/settings/',
          '/premium/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
