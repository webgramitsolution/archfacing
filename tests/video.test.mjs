/**
 * Video link parsing — YouTube and Dailymotion.
 *
 *   pnpm test:video
 *
 * This is the one test that never touches the network — it is all regex.
 */

import { parseVideoUrl, validateVideoUrl } from '../src/lib/video.ts'

let pass = 0
let fail = 0

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

console.log('\n── Every form of a YouTube URL ──')

const YT_ID = 'dQw4w9WgXcQ'
const youtubeForms = [
  `https://www.youtube.com/watch?v=${YT_ID}`,
  `https://youtube.com/watch?v=${YT_ID}`,
  `https://m.youtube.com/watch?v=${YT_ID}`,
  `https://youtu.be/${YT_ID}`,
  `https://www.youtube.com/embed/${YT_ID}`,
  `https://www.youtube.com/shorts/${YT_ID}`,
  `https://www.youtube.com/live/${YT_ID}`,
  `https://www.youtube.com/watch?feature=share&v=${YT_ID}`,
  `http://youtube.com/watch?v=${YT_ID}`,
]

for (const url of youtubeForms) {
  const v = parseVideoUrl(url)
  const short = url.replace('https://', '').slice(0, 42)
  check(short, v?.host === 'youtube' && v.videoId === YT_ID, `→ ${v?.videoId}`)
}

const yt = parseVideoUrl(youtubeForms[3])
check('the canonical URL is produced', yt.url === `https://www.youtube.com/watch?v=${YT_ID}`)
check('the embed uses nocookie (privacy)', yt.embedUrl.includes('youtube-nocookie.com'))
check('the thumbnail is produced', yt.thumbnailUrl === `https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg`)

console.log('\n── The forms of a Dailymotion URL ──')

const DM_ID = 'x8abcde'
const dmForms = [
  `https://www.dailymotion.com/video/${DM_ID}`,
  `https://dailymotion.com/video/${DM_ID}`,
  `https://dai.ly/${DM_ID}`,
  `https://www.dailymotion.com/embed/video/${DM_ID}`,
  `https://www.dailymotion.com/video/${DM_ID}_some-title-slug`,
]

for (const url of dmForms) {
  const v = parseVideoUrl(url)
  const short = url.replace('https://', '').slice(0, 46)
  check(short, v?.host === 'dailymotion' && v.videoId === DM_ID, `→ ${v?.videoId}`)
}

const dm = parseVideoUrl(dmForms[2])
check('the canonical URL is produced', dm.url === `https://www.dailymotion.com/video/${DM_ID}`)
check('the embed URL is produced', dm.embedUrl === `https://www.dailymotion.com/embed/video/${DM_ID}`)
check('the thumbnail is produced', dm.thumbnailUrl.includes('/thumbnail/video/'))

console.log('\n── What must not be accepted ──')

const rejected = [
  ['vimeo.com/123456', 'Vimeo'],
  ['https://vimeo.com/123456789', 'Vimeo (full URL)'],
  ['https://example.com/video.mp4', 'a direct MP4'],
  ['https://youtube.com/watch?v=short', 'a short YouTube id'],
  ['https://notyoutube.com/watch?v=dQw4w9WgXcQ', 'a fake domain'],
  ['javascript:alert(1)', 'javascript: URL'],
  ['https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', 'domain spoofing'],
  ['just some words written out', 'plain text'],
]

for (const [url, label] of rejected) {
  check(`${label} rejected`, parseVideoUrl(url) === null)
}

console.log('\n── validateVideoUrl ──')

const empty = validateVideoUrl('')
check('empty is allowed (a video is not required)', empty.ok === true && !empty.video)

const good = validateVideoUrl(`  https://youtu.be/${YT_ID}  `)
check('surrounding whitespace is trimmed', good.ok === true && good.video?.videoId === YT_ID)

const bad = validateVideoUrl('https://vimeo.com/123')
check('a wrong host produces an error', bad.ok === false && !!bad.error)
check('the error names both hosts',
  bad.error.includes('YouTube') && bad.error.includes('Dailymotion'), `(${bad.error})`)

console.log(`\n${'─'.repeat(52)}`)
console.log(`  ${pass} passed · ${fail} failed`)
console.log(`${'─'.repeat(52)}\n`)
process.exit(fail ? 1 : 0)
