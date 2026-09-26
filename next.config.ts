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
}

export default nextConfig
