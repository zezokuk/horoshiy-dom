import { getRegion } from '@/lib/data'
import { INDEXABLE, PROTOCOL, regionFromHost } from '@/lib/site'

/**
 * /robots.txt per host: points to this host's own sitemap and its own Host.
 * Until launch the whole site is closed (pages also carry noindex); NEXT_PUBLIC_INDEX=1 opens it.
 */
export async function GET(req: Request) {
  const host = (req.headers.get('host') || '').toLowerCase()
  const slug = regionFromHost(host)
  if (slug && !(await getRegion(slug))) return new Response('Not found', { status: 404 })
  const lines = INDEXABLE
    ? ['User-agent: *', 'Disallow: /admin', 'Disallow: /api/', 'Allow: /api/media/', '']
    : ['# Сайт закрыт от поиска до запуска. Открыть: NEXT_PUBLIC_INDEX=1', 'User-agent: *', 'Disallow: /', '']
  lines.push(`Sitemap: ${PROTOCOL}://${host}/sitemap.xml`)
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
