import { EMBED_ALLOW, VIDEO_HOST_LABEL, type VideoHost } from '@/lib/video'

/**
 * Renders a YouTube / Dailymotion video.
 *
 * `loading="lazy"` is essential — without it every listing page would load
 * dozens of iframes at once and the page would get heavy.
 */
export function VideoEmbed({
  embedUrl,
  host,
  title,
}: {
  embedUrl: string
  host: VideoHost | 'YOUTUBE' | 'DAILYMOTION'
  title: string
}) {
  const label =
    VIDEO_HOST_LABEL[
      (typeof host === 'string' ? host.toLowerCase() : host) as VideoHost
    ] ?? 'Video'

  return (
    <figure className="my-6">
      <div className="relative aspect-video overflow-hidden rounded-card border border-line bg-ink">
        <iframe
          src={embedUrl}
          title={title}
          loading="lazy"
          allow={EMBED_ALLOW}
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <figcaption className="eyebrow mt-2">on {label}</figcaption>
    </figure>
  )
}
