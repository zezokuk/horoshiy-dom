import { REGION_MODE, ROOT_DOMAIN } from './site'

// Regions live on subdomains, and localStorage and sessionStorage belong to one subdomain only: what the main site
// remembered was gone on krd.… A cookie set for the root domain is the one memory they share. Browser only.
function domain() {
  const root = ROOT_DOMAIN.split(':')[0]
  const host = window.location.hostname
  // a preview address (vercel.app…) or a bare "localhost" takes no domain: the cookie then stays on this host, which is enough there
  if (REGION_MODE !== 'subdomain' || !root.includes('.') || (host !== root && !host.endsWith(`.${root}`))) return ''
  return `; domain=${root}`
}

export function getShared(key: string) {
  const row = document.cookie.split('; ').find((c) => c.startsWith(`${key}=`))
  if (!row) return null
  try {
    return decodeURIComponent(row.slice(key.length + 1))
  } catch {
    return null
  }
}

/** No maxAge: until the browser closes (one visit). */
export function setShared(key: string, value: string, maxAge?: number) {
  const secure = window.location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; samesite=lax${domain()}${secure}${maxAge === undefined ? '' : `; max-age=${maxAge}`}`
}

export function removeShared(key: string) {
  setShared(key, '', 0)
}
