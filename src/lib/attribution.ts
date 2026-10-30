// Where the visitor came from (UTM tags and ad click ids, external referrer, the first page of the visit).
// Kept on our side, not in Yandex Metrika: if Metrika or Direct are down, every lead still knows its source.
// One cookie keeps the current visit, another the last ad / external source for 30 days, so a person who clicked an ad
// on Monday and came back directly on Wednesday is still counted for that ad. Cookies, not storage: an ad lands on the
// main site and the house with the form lives on krd.…, so the source has to cross subdomains.
import { AD_PARAM } from './leadSource'
import { getShared, setShared } from './sharedCookie'

const VISIT = 'hd_attr_visit'
const LAST = 'hd_attr'
const DAYS = 30
const MAX_COOKIE = 3000 // the browser refuses a cookie over about 4 KB once encoded

type Attribution = { utm: Record<string, string>; ref: string; landing: string }
type Stored = Attribution & { at?: number }

const empty = (): Attribution => ({ utm: {}, ref: '', landing: '' })

function read(key: string): Stored | null {
  try {
    const a = JSON.parse(getShared(key) || 'null')
    return a && typeof a === 'object' ? { utm: a.utm || {}, ref: a.ref || '', landing: a.landing || '', at: a.at } : null
  } catch {
    return null
  }
}

function write(key: string, a: Stored, maxAge?: number) {
  const value = JSON.stringify(a)
  // too long to keep (an ad with huge tags): the lead just goes without the source
  if (encodeURIComponent(value).length <= MAX_COOKIE) setShared(key, value, maxAge)
}

export function captureAttribution() {
  const utm: Record<string, string> = {}
  new URLSearchParams(window.location.search).forEach((v, k) => {
    if (AD_PARAM.test(k)) utm[k] = v
  })
  // other subdomains of the site (krd.…) are not a source
  const host = window.location.hostname.split('.').slice(-2).join('.')
  const ref = document.referrer && !new URL(document.referrer).hostname.endsWith(host) ? document.referrer : ''
  const visit = read(VISIT)
  const hasAd = Object.keys(utm).length > 0
  // the first page of this visit stays; a new ad click within the visit overrides the source
  if (!visit || hasAd || (!visit.ref && ref)) {
    write(VISIT, {
      utm: hasAd ? utm : (visit?.utm ?? {}),
      ref: ref || visit?.ref || '',
      landing: visit?.landing || window.location.href.slice(0, 300),
    })
  }
  if (hasAd || ref) write(LAST, { utm, ref, landing: window.location.href.slice(0, 300), at: Date.now() }, DAYS * 86400)
}

export function readAttribution(): Attribution {
  const visit = read(VISIT) ?? empty()
  if (Object.keys(visit.utm).length || visit.ref) return visit
  // a direct visit now: fall back to the last ad / external source within 30 days
  const last = read(LAST)
  if (last && last.at && Date.now() - last.at < DAYS * 864e5) return { utm: last.utm, ref: last.ref, landing: visit.landing || last.landing }
  return visit
}
