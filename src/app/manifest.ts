import type { MetadataRoute } from 'next'

/**
 * The web app manifest.
 *
 * The dashboard is drawn as an app on a phone — a bottom tab bar, a sheet for
 * the rest — so it should be installable as one. `display: standalone` is what
 * drops the browser chrome once it is added to a home screen; without this
 * file the layout still looks like an app but never behaves as one.
 *
 * `start_url` is the dashboard rather than the marketing home, because someone
 * who installs this is a registrant, not a visitor.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ArchFacing — Design. Build. Connect.',
    short_name: 'ArchFacing',
    description:
      'India’s architecture, interior design and building-materials marketplace.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F8FAFC',
    theme_color: '#F97316',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: 'https://ik.imagekit.io/archfacing/ArchFacing%20Logo/ArchFacing%20Logo.webp?tr=w-192,h-192,cm-pad_resize,bg-FFFFFF',
        sizes: '192x192',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: 'https://ik.imagekit.io/archfacing/ArchFacing%20Logo/ArchFacing%20Logo.webp?tr=w-512,h-512,cm-pad_resize,bg-FFFFFF',
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'any',
      },
    ],
  }
}
