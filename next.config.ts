import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // OCR for the contact-details check on listing images runs worker threads
  // and a wasm core — it must be loaded from node_modules, not bundled.
  serverExternalPackages: ['tesseract.js', '@tesseract.js-data/eng'],
  images: {
    remotePatterns: [
      // Unsplash — event, speaker and gallery photography
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // ArchFacing official assets — ImageKit CDN
      { protocol: 'https', hostname: 'ik.imagekit.io', pathname: '/archfacing/**' },
      // ArchFacing official assets — Cloudinary (page banners)
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/c7h30ayk/**' },

      // Video thumbnails — in place of §7.10.2 we take YouTube/Dailymotion
      // links, so their thumbnail hosts are needed here too
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 's1.dmcdn.net' },
      { protocol: 'https', hostname: 's2.dmcdn.net' },
      { protocol: 'https', hostname: 'www.dailymotion.com', pathname: '/thumbnail/**' },

      // When R2 is configured, its public host is added here
      ...(process.env.R2_PUBLIC_URL
        ? [
            {
              protocol: 'https' as const,
              hostname: new URL(process.env.R2_PUBLIC_URL).hostname,
            },
          ]
        : []),
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '25mb' }, // §7.10 — a posting can carry several images
  },

  /*
   * Dev only, and the reason pages felt slow to open.
   *
   * `next dev` compiles a route on first request and then DISPOSES it again —
   * by default it keeps only a handful (pagesBufferLength) for about a minute
   * (maxInactiveAge). On a dashboard this size that means clicking through
   * five or six screens evicts the first ones, so coming back recompiles them
   * and costs 12–25 seconds again. Measured here: the same route twice in a
   * row answered in ~900 ms, but six different routes in a cycle each took
   * 12–17 s.
   *
   * Holding every compiled route for an hour trades some dev-server memory for
   * navigation that stays fast all session. Production is unaffected — there
   * is no on-demand compilation there at all.
   */
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 100,
  },
  // Lint is run separately; don't let a style warning block a production build.
  eslint: { ignoreDuringBuilds: true },

  poweredByHeader: false,

  /*
   * Security headers on every response. The CSP is Report-Only for now: it
   * logs violations in the browser console without blocking anything, so the
   * YouTube / Dailymotion embeds, CDN images and inline Next.js scripts keep
   * working while the policy is tuned. Switch the key to
   * `Content-Security-Policy` once the console is clean.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
      'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.dailymotion.com https://geo.dailymotion.com https://api.razorpay.com https://checkout.razorpay.com',
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
          // Browsers ignore HSTS over plain http, so this is harmless in dev
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
}

export default nextConfig
