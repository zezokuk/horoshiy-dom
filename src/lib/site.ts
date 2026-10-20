/**
 * Where regions live. Decided per launch (with the SEO specialist), switched by one env variable:
 *   NEXT_PUBLIC_REGION_MODE=subdomain → krd.домен.ru/…   (one Yandex region per subdomain — the default)
 *   NEXT_PUBLIC_REGION_MODE=path      → домен.ru/r/krd/…
 * NEXT_PUBLIC_ROOT_DOMAIN is the bare host: "horoshiy-dom.ru" in production, "localhost:3000" in dev
 * (Chrome and Edge resolve krd.localhost to this machine, so subdomains work locally without any setup).
 */
export const ROOT_DOMAIN = asciiHost(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000')

/**
 * A Cyrillic domain (хорошийдом.рф) may be written in .env as is: browsers send the Host header and the referrer in
 * punycode (xn--d1ahdngadl7b7a.xn--p1ai), so the site compares and builds every address in punycode.
 * The URL parser does the conversion the same way in Node and in browsers (tests/int/idn.int.spec.ts).
 */
function asciiHost(host: string) {
  try {
    return new URL(`http://${host.trim()}`).host
  } catch {
    return host.trim().toLowerCase()
  }
}
export const REGION_MODE: 'subdomain' | 'path' = process.env.NEXT_PUBLIC_REGION_MODE === 'path' ? 'path' : 'subdomain'
// http only for local dev hosts (localhost, horoshiy.localhost:3000…); everything public is https
export const PROTOCOL = /(^|\.)localhost(:\d+)?$/.test(ROOT_DOMAIN) ? 'http' : 'https'
export const MAIN_URL = `${PROTOCOL}://${ROOT_DOMAIN}`
export const INDEXABLE = process.env.NEXT_PUBLIC_INDEX === '1'

/** Pages that exist only once for the whole company — on the main domain, never on a region subdomain (no duplicates). */
export const GLOBAL_PATHS = ['/locations', '/projects', '/about', '/mortgage', '/contacts', '/privacy', '/consent', '/build']

/** Link to a page of a region: regionHref('krd', '/objects/kalina'). */
export function regionHref(slug: string, path = '/') {
  // no trailing slashes anywhere: Next redirects /x/ → /x, so a slash would cost every click a redirect
  return REGION_MODE === 'subdomain' ? `${PROTOCOL}://${slug}.${ROOT_DOMAIN}${path}` : `/r/${slug}${path === '/' ? '' : path}`
}

/** Link to a company-wide page. Absolute in subdomain mode, so it leaves the region subdomain. */
export function mainHref(path = '/') {
  return REGION_MODE === 'subdomain' ? `${MAIN_URL}${path}` : path
}

/** Region slug from a host like "krd.horoshiy-dom.ru" (null for the main domain or a foreign host). */
export function regionFromHost(host: string | null) {
  const h = (host || '').toLowerCase().replace(/^www\./, '')
  if (!h.endsWith(`.${ROOT_DOMAIN}`)) return null
  const sub = h.slice(0, -ROOT_DOMAIN.length - 1)
  return /^[a-z][a-z0-9-]{1,30}$/.test(sub) ? sub : null
}
