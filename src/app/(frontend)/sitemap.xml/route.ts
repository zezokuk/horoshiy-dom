import { getEstates, getHouses, getProjects, getRegion } from '@/lib/data'
import { GLOBAL_PATHS, mainHref, regionFromHost, regionHref } from '@/lib/site'

/**
 * /sitemap.xml per host — a sitemap may only list addresses of its own host (Yandex checks it):
 *   main domain → company pages and projects;
 *   region subdomain → its home, catalog, estates and houses («скоро»: just the waitlist page).
 * Each subdomain is added to Yandex Webmaster as its own site with its own region.
 */
export async function GET(req: Request) {
  const slug = regionFromHost(req.headers.get('host'))
  let urls: { loc: string; lastmod?: string | null; priority: number }[]

  if (slug) {
    const region = await getRegion(slug)
    if (!region) return new Response('Not found', { status: 404 })
    urls = [{ loc: regionHref(slug), lastmod: region.updatedAt, priority: 1 }]
    if (region.status === 'active') {
      const [estates, houses] = await Promise.all([getEstates(region.id), getHouses({ region: region.id })])
      urls.push({ loc: regionHref(slug, '/catalog'), priority: 0.9 })
      urls.push(...estates.map((e) => ({ loc: regionHref(slug, `/objects/${e.slug}`), lastmod: e.updatedAt, priority: 0.8 })))
      urls.push(...houses.map((h) => ({ loc: regionHref(slug, `/houses/${h.code}`), lastmod: h.updatedAt, priority: h.status === 'free' ? 0.7 : 0.4 })))
    }
  } else {
    const projects = await getProjects()
    urls = [
      { loc: mainHref('/'), priority: 1 },
      { loc: mainHref('/catalog'), priority: 0.9 },
      ...GLOBAL_PATHS.map((p) => ({ loc: mainHref(p), priority: ['/privacy', '/consent'].includes(p) ? 0.2 : 0.7 })),
      ...projects.map((p) => ({ loc: mainHref(`/projects/${p.slug}`), lastmod: p.updatedAt, priority: 0.6 })),
    ]
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}<priority>${u.priority}</priority></url>`)
      .join('\n') +
    '\n</urlset>\n'
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
}
