import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archfacing.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Keep crawlers out of anything that needs a login or holds private data
        disallow: [
          '/admin/', '/dashboard/', '/api/',
          '/cart', '/login', '/register',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
