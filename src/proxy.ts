import { NextResponse, type NextRequest } from 'next/server'
import { GLOBAL_PATHS, MAIN_URL, PROTOCOL, REGION_MODE, ROOT_DOMAIN, regionFromHost } from './lib/site'

/**
 * Region routing (Next 16 «proxy», formerly middleware).
 * subdomain mode:
 *   krd.домен.ru/objects/kalina/  → renders /r/krd/objects/kalina/ (URL in the browser stays as is)
 *   krd.домен.ru/projects/        → 308 to домен.ru/projects/ (company pages live only on the main domain)
 *   домен.ru/r/krd/…              → 308 to krd.домен.ru/… (one address per page for search engines)
 * path mode: nothing to do, region pages are simply /r/krd/….
 */
// Location set by hand: NextResponse.redirect() shortens a URL it thinks is «same origin» to "/path",
// and in dev nextUrl is localhost:3000 for every subdomain — krd.localhost would then redirect to itself forever.
const redirect = (location: string) => new NextResponse(null, { status: 308, headers: { Location: location } })

export function proxy(req: NextRequest) {
  if (REGION_MODE !== 'subdomain') return NextResponse.next()
  const { pathname, search } = req.nextUrl
  const host = req.headers.get('host')
  const region = regionFromHost(host)

  if (!region) {
    const m = pathname.match(/^\/r\/([a-z][a-z0-9-]*)(\/.*)?$/)
    // the site's protocol, not the request's: behind nginx every request reaches Next over plain http (found 20.10)
    if (m) return redirect(`${PROTOCOL}://${m[1]}.${ROOT_DOMAIN}${m[2] || '/'}${search}`)
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin') || GLOBAL_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return redirect(`${MAIN_URL}${pathname}${search}`)
  }
  const url = req.nextUrl.clone()
  url.pathname = `/r/${region}${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  // everything except Next internals, Payload API, uploaded media and files with an extension (images, robots.txt…)
  matcher: ['/((?!_next/|api/|media/|.*\\.[a-z0-9]+$).*)'],
}
