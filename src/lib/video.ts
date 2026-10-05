/**
 * Video links — YouTube and Dailymotion.
 *
 * PDF §7.10.2 specified MP4 upload (20 MB), but we take a link instead. The
 * advantages:
 *   · not a single MB of server storage is used
 *   · YouTube/Dailymotion bear the bandwidth cost
 *   · mobile streaming runs at their own adaptive quality
 *   · 20 MB would barely hold a one-minute video anyway
 *
 * §7.10.6 already refers to a YouTube link — this simply extends that.
 */

export type VideoHost = 'youtube' | 'dailymotion'

export type ParsedVideo = {
  host: VideoHost
  /** The host's own video id */
  videoId: string
  /** The clean canonical URL — this is what we store in the DB */
  url: string
  /** The URL to place in an iframe */
  embedUrl: string
  /** A thumbnail that can be shown without JavaScript */
  thumbnailUrl: string
}

/**
 * YouTube accepts several URL forms:
 *   youtube.com/watch?v=ID
 *   youtu.be/ID
 *   youtube.com/embed/ID
 *   youtube.com/shorts/ID
 *   youtube.com/live/ID
 */
const YOUTUBE_PATTERNS = [
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
  /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
]

/**
 * Dailymotion:
 *   dailymotion.com/video/ID
 *   dai.ly/ID
 *   dailymotion.com/embed/video/ID
 * The ID is alphanumeric, and is sometimes followed by a slug.
 */
const DAILYMOTION_PATTERNS = [
  /^https?:\/\/(?:www\.)?dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
  /^https?:\/\/dai\.ly\/([a-zA-Z0-9]+)/,
  /^https?:\/\/(?:www\.)?dailymotion\.com\/embed\/video\/([a-zA-Z0-9]+)/,
]

/**
 * Recognises the link and derives every form of it.
 * Returns null if unrecognised — the caller should show a clear error.
 */
export function parseVideoUrl(input: string): ParsedVideo | null {
  const raw = input.trim()
  if (!raw) return null

  for (const re of YOUTUBE_PATTERNS) {
    const m = raw.match(re)
    if (m) {
      const videoId = m[1]
      return {
        host: 'youtube',
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
        // mqdefault is a true 16:9 frame with no black bars; hqdefault is
        // 4:3 with letterbox bars that show through the 16:10 card crop.
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      }
    }
  }

  for (const re of DAILYMOTION_PATTERNS) {
    const m = raw.match(re)
    if (m) {
      const videoId = m[1]
      return {
        host: 'dailymotion',
        videoId,
        url: `https://www.dailymotion.com/video/${videoId}`,
        embedUrl: `https://www.dailymotion.com/embed/video/${videoId}`,
        thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
      }
    }
  }

  return null
}

/** For form validation — with a clear, user-facing message */
export function validateVideoUrl(input: string): {
  ok: boolean
  video?: ParsedVideo
  error?: string
} {
  const raw = input.trim()
  if (!raw) return { ok: true } // a video is optional

  const video = parseVideoUrl(raw)
  if (!video) {
    return {
      ok: false,
      error:
        'Only YouTube or Dailymotion links are accepted — ' +
        'for example youtube.com/watch?v=… or dailymotion.com/video/…',
    }
  }

  return { ok: true, video }
}

/** The host name shown in the UI */
export const VIDEO_HOST_LABEL: Record<VideoHost, string> = {
  youtube: 'YouTube',
  dailymotion: 'Dailymotion',
}

/**
 * CSP/permission attributes for the embed.
 * Both hosts request fullscreen and picture-in-picture.
 *
 * `web-share` is deliberately NOT requested — several Chromium builds do not
 * recognise it as a permissions-policy feature and print an "Unrecognized
 * feature" console warning for every embed. The player's share button simply
 * falls back to copy-link without it.
 */
export const EMBED_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
