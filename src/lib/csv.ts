/**
 * One CSV cell for the admin exports.
 *
 * Quotes values that contain a comma, quote or line break, and neutralises
 * spreadsheet formula injection: a text value starting with = + - @ (or a tab /
 * carriage return) is prefixed with an apostrophe so Excel and Sheets show it
 * as text instead of running it. Real numbers are left as they are.
 */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' || typeof v === 'bigint') return String(v)
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
