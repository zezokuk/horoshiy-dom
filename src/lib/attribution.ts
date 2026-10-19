// Where the visitor came from (UTM tags and ad click ids, external referrer, the first page of the visit).
// Kept on our side, not in Yandex Metrika: if Metrika or Direct are down, every lead still knows its source.
// The session keeps the current visit; localStorage keeps the last ad / external source for 30 days, so a person
// who clicked an ad on Monday and came back directly on Wednesday is still counted for that ad.
import { AD_PARAM } from './leadSource'

const KEY = 'hd_attr'
const DAYS = 30

type Attribution = { utm: Record<string, string>; ref: string; landing: string }
type Stored = Attribution & { at?: number }

const empty = (): Attribution => ({ utm: {}, ref: '', landing: '' })

function read(storage: Storage | undefined): Stored | null {
  try {
    const a = JSON.parse(storage?.getItem(KEY) || 'null')
    return a && typeof a === 'object' ? { utm: a.utm || {}, ref: a.ref || '', landing: a.landing || '', at: a.at } : null
  } catch {
    return null
  }
}

function write(storage: Storage | undefined, a: Stored) {
  try {
    storage?.setItem(KEY, JSON.stringify(a))
  } catch {
    // storage blocked (private mode) — the lead just goes without the source
  }
}

const ls = () => (typeof localStorage === 'undefined' ? undefined : localStorage)
const ss = () => (typeof sessionStorage === 'undefined' ? undefined : sessionStorage)

export function captureAttribution() {
  const utm: Record<string, string> = {}
  new URLSearchParams(window.location.search).forEach((v, k) => {
    if (AD_PARAM.test(k)) utm[k] = v
  })
  // other subdomains of the site (krd.…) are not a source
  const host = window.location.hostname.split('.').slice(-2).join('.')
  const ref = document.referrer && !new URL(document.referrer).hostname.endsWith(host) ? document.referrer : ''
  const session = read(ss())
  const hasAd = Object.keys(utm).length > 0
  // the first page of this visit stays; a new ad click within the visit overrides the source
  if (!session || hasAd || (!session.ref && ref)) {
    write(ss(), {
      utm: hasAd ? utm : (session?.utm ?? {}),
      ref: ref || session?.ref || '',
      landing: session?.landing || window.location.href.slice(0, 300),
    })
  }
  if (hasAd || ref) write(ls(), { utm, ref, landing: window.location.href.slice(0, 300), at: Date.now() })
}

export function readAttribution(): Attribution {
  const session = read(ss()) ?? empty()
  if (Object.keys(session.utm).length || session.ref) return session
  // a direct visit now: fall back to the last ad / external source within 30 days
  const last = read(ls())
  if (last && last.at && Date.now() - last.at < DAYS * 864e5) return { utm: last.utm, ref: last.ref, landing: session.landing || last.landing }
  return session
}
