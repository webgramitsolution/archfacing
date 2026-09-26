import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/** ArchFacing's official logo — hosted on the ImageKit CDN */
export const LOGO_URL =
  'https://ik.imagekit.io/archfacing/ArchFacing%20Logo/ArchFacing%20Logo.webp'

type LogoProps = {
  className?: string
  /** small in the header, large in the hero */
  size?: 'sm' | 'md' | 'lg'
  /** render as a link, or just the image */
  asLink?: boolean
  priority?: boolean
}

/**
 * The actual logo is 256×145 (aspect ≈ 1.77:1), so the dimensions keep that
 * same ratio — otherwise Next.js's Image squashes it.
 */
const LOGO_ASPECT = 256 / 145

const SIZES = {
  sm: { height: 38 },
  md: { height: 56 },
  lg: { height: 88 },
} as const

export function Logo({
  className,
  size = 'sm',
  asLink = true,
  priority = false,
}: LogoProps) {
  const { height } = SIZES[size]
  const width = Math.round(height * LOGO_ASPECT)

  const img = (
    <Image
      src={LOGO_URL}
      alt="ArchFacing — We the Designa and Designi"
      width={width}
      height={height}
      priority={priority}
      className={cn('object-contain', className)}
    />
  )

  if (!asLink) return img

  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center rounded-sm"
      aria-label="ArchFacing — home"
    >
      {img}
    </Link>
  )
}
