/**
 * Finds phone numbers in free text — the owner's rule is that a listing never
 * carries contact details; buyers reach a seller through ArchFacing enquiries.
 *
 * Pure (no Node APIs) so the posting form can warn while typing and the
 * server can enforce with the same logic.
 *
 * Catches: Indian mobiles with or without +91 / 0 (98765 43210,
 * +91-98765-43210, 098765 43210), STD landlines (011-2345 6789), toll-free
 * (1800-123-4567), and numbers spelled out in words ("nine eight seven …").
 * Deliberately NOT caught: pincodes, years, areas and prices — commas and
 * "x" are not treated as digit separators, and a run must reduce to a real
 * phone shape.
 */

const WORD_DIGIT: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
}

/** Runs of digits joined by spaces, dashes, dots, slashes or brackets. */
const CANDIDATE = /\+?\(?\d[\d\s\-./()]{7,}\d/g

function isPhone(digits: string, hadPlus: boolean): boolean {
  let d = digits
  if (d.length === 13 && d.startsWith('091')) d = d.slice(3)
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('1800')) return true
  if (d.length === 11 && d.startsWith('0')) {
    d = d.slice(1)
    // after the trunk 0: a mobile, or an STD code + number
    return /^[1-9]\d{9}$/.test(d)
  }
  if (d.length === 10) return /^[6-9]/.test(d) || hadPlus
  return hadPlus && d.length >= 10 && d.length <= 13
}

/** Every phone-shaped number in the text, as the digits found. */
export function findPhoneNumbers(text: string): string[] {
  if (!text) return []
  const found = new Set<string>()

  for (const m of text.matchAll(CANDIDATE)) {
    const raw = m[0]
    // A long run can hold two numbers ("98765 43210 / 91234 56789") — try
    // the whole run, then each part split on a slash.
    for (const part of [raw, ...raw.split('/')]) {
      // "600001 2024" is a pincode and a year, not a mobile number.
      const groups = part.trim().split(/[\s\-.()]+/).filter(Boolean)
      if (groups.length === 2 && groups[0].length === 6 && /^(19|20)\d\d$/.test(groups[1])) continue
      const digits = part.replace(/\D/g, '')
      if (digits.length >= 10 && isPhone(digits, part.trimStart().startsWith('+'))) found.add(digits)
    }
  }

  // Spelled-out digits: ten or more digit words in a row.
  const words = text.toLowerCase().split(/[^a-z0-9]+/)
  let run = ''
  const flush = () => { if (run.length >= 10 && isPhone(run, false)) found.add(run); run = '' }
  for (const w of words) {
    if (w in WORD_DIGIT) run += WORD_DIGIT[w]
    else if (/^\d$/.test(w)) run += w
    else flush()
  }
  flush()

  return [...found]
}

/** "98•••••210" — enough to recognise, not enough to repeat the number. */
export function maskPhone(digits: string): string {
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 2)}${'•'.repeat(digits.length - 5)}${digits.slice(-3)}`
}

export const NO_PHONE_MESSAGE =
  'Phone numbers are not allowed on listings — buyers contact you through ArchFacing enquiries.'
