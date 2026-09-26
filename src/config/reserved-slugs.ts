/**
 * Words a seller's public address may never be.
 *
 * A seller's storefront lives at the root — `archfacing.com/webgramitsolution`
 * — which is what makes the address worth having, and also what makes this
 * list necessary. Next.js matches a concrete segment before the dynamic
 * `[company]` one, so a seller who managed to register the slug "products"
 * would simply be unreachable: `/products` would keep resolving to the
 * catalogue and their shop would exist at an address nobody could visit.
 *
 * Everything below is either a real route today or one obviously coming, plus
 * the handful of names that would be confusing or dangerous to hand out.
 * Checked when a slug is generated AND again when one is resolved, so a row
 * that predates an entry here still cannot shadow a page.
 */

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // ─── routes that exist ───
  'admin', 'api', 'dashboard', 'auth', 'login', 'logout', 'register', 'signup',
  'advertisements', 'around-us', 'artistry', 'blog', 'cart', 'club',
  'competition', 'consult-nearby', 'designers-associates', 'legal',
  'membership', 'merchandise', 'pact', 'podcast', 'products', 'projects',

  // ─── framework and infrastructure ───
  '_next', 'static', 'public', 'assets', 'img', 'images', 'uploads', 'favicon',
  'robots', 'sitemap', 'manifest', 'sw', 'health',

  // ─── obvious near-future routes ───
  'search', 'checkout', 'orders', 'account', 'profile', 'settings', 'help',
  'support', 'contact', 'about', 'pricing', 'plans', 'careers', 'press',
  'news', 'events', 'download', 'downloads', 'app', 'mobile',

  // ─── names that would mislead ───
  'archfacing', 'official', 'verified', 'admin-panel', 'seller', 'sellers',
  'designa', 'designi', 'bmf', 'corporate', 'consultant', 'professional',
])

/** A public address from a company or firm name. */
export function toSellerSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(ar|er|dr|mr|ms|mrs|shri|smt)\.?\s+/i, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Whether a slug may be used as a public address.
 *
 * Rejects the reserved words, anything too short to be a real name, and
 * anything that looks like a file so `/acme.json` cannot be mistaken for one.
 */
export function isUsableSellerSlug(slug: string): boolean {
  if (!slug || slug.length < 3) return false
  if (RESERVED_SLUGS.has(slug)) return false
  if (slug.includes('.')) return false
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)
}
