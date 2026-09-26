import type { Metadata, Viewport } from 'next'
import { Poppins, Inter, IBM_Plex_Mono } from 'next/font/google'
import { LOGO_URL } from '@/components/logo'
import './globals.css'

/**
 * Poppins — headings H1-H6, buttons, navigation and UI components.
 * Inter   — body text, paragraphs, labels and descriptions.
 *
 * Both are named in the ARCHFACING THEME GUIDE. Poppins has no variable
 * font on Google Fonts, so the weights are listed explicitly; keep this
 * list tight, because every weight is a separate file the visitor downloads.
 */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '500', '600', '700'], // 300: the phone hero headline
  variable: '--font-poppins',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'ArchFacing — India\'s Architecture & Design Marketplace',
    template: '%s · ArchFacing',
  },
  description:
    'ArchFacing is India\'s B2B marketplace for the architecture, interior design and building materials industry. Find architects, interior designers, consultants and suppliers in your own area.',
  keywords: [
    'architecture India', 'interior design', 'DESIGNA', 'DESIGNI',
    'building materials', 'architects near me', 'PACT', 'ArchFacing',
  ],
  openGraph: {
    type: 'website',
    siteName: 'ArchFacing',
    title: 'ArchFacing — We the Designa and Designi',
    description:
      'India\'s B2B marketplace for the building-design industry — architects, designers, consultants and material suppliers in one place.',
    images: [{ url: LOGO_URL, width: 1200, height: 630, alt: 'ArchFacing' }],
  },
  icons: { icon: LOGO_URL, apple: LOGO_URL },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#15181A',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${inter.variable} ${plexMono.variable}`}
    >
      {/*
        No <SessionProvider> here, deliberately.

        Every page reads the session on the server with `auth()`. A
        SessionProvider would add a client-side fetch of /api/auth/session on
        every page load and on every window focus — with nothing calling
        `useSession()` to consume it. When that fetch failed (a restarting dev
        server, a flaky connection, an offline tab) next-auth surfaced a
        "Failed to fetch … ClientFetchError" overlay over a page that was
        otherwise working perfectly.

        `signIn()` and `signOut()` from next-auth/react do NOT need the
        provider — they post straight to the auth endpoints. Only
        `useSession()` does. If a client component ever genuinely needs the
        session, prefer passing it down from a server component; add the
        provider back only if that becomes impractical.
      */}
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
