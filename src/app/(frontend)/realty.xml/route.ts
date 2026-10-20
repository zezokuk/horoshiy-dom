import { getCompany, getEstates, getHouses, getRegion } from '@/lib/data'
import { formatArea } from '@/lib/format'
import { absUrl } from '@/lib/seo'
import { regionFromHost } from '@/lib/site'
import { houseView } from '@/lib/view'

/**
 * /realty.xml on a region subdomain — the Yandex Webmaster feed «Список объектов недвижимости» (20.10): every free
 * house of the region with its address, area, plot, price and photos, so Search shows the houses as listings and
 * indexes them faster. No <region>: the admin's region is «Краснодар и Адыгея», not a subject of the federation —
 * the locality and the address are exact, Yandex places the house by them. Built from the admin, nothing to keep by hand. Added in Webmaster → the region's site →
 * «Представление в поиске» → «Объекты недвижимости» (DEPLOY.md). Format: yandex.ru/support/webmaster/ru/search-appearance/object
 */
export async function GET(req: Request) {
  const slug = regionFromHost(req.headers.get('host'))
  const region = slug ? await getRegion(slug) : null
  if (!region || region.status !== 'active') return new Response('Not found', { status: 404 })
  const [houses, estates, company] = await Promise.all([getHouses({ region: region.id }), getEstates(region.id), getCompany()])

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const tag = (name: string, value: string | number | null | undefined) => (value == null || value === '' ? '' : `<${name}>${esc(String(value))}</${name}>`)
  const offers = houses
    .filter((h) => h.status === 'free')
    .map((house) => {
      const h = houseView(house)
      const e = estates.find((x) => x.slug === h.estateSlug)
      const lot = h.plot?.replace(',', '.').match(/\d+(\.\d+)?/)?.[0] // «4–4,5 сот.» → the smaller, honest number
      const images = [h.plan, h.photo].map((u) => absUrl(u)).filter(Boolean) as string[] // the plan first, as Yandex asks
      return [
        `  <offer internal-id="${esc(h.code)}">`,
        `    ${tag('url', h.href)}`,
        `    ${tag('type', 'продажа')}`,
        `    ${tag('category', 'дом с участком')}`,
        `    <location>${tag('country', 'Россия')}${tag('locality-name', e?.place)}${tag('address', e?.address || e?.place || e?.name)}${e?.lat != null && e?.lng != null ? `${tag('latitude', e.lat)}${tag('longitude', e.lng)}` : ''}</location>`,
        `    <area>${tag('value', h.area)}${tag('unit', 'кв. м')}</area>`,
        lot ? `    <lot-area>${tag('value', lot)}${tag('unit', 'сотка')}</lot-area>` : '',
        `    <price>${tag('value', h.price)}${tag('currency', 'RUB')}</price>`,
        `    ${tag('dealstatus', 'продажа от застройщика')}`,
        h.bedrooms ? `    ${tag('rooms', h.bedrooms)}` : '',
        `    <sales-agent>${tag('name', company.name)}${tag('phone', region.office?.phone || company.phone)}${tag('category', 'застройщик')}</sales-agent>`,
        ...images.map((u) => `    ${tag('image', u)}`),
        `    ${tag('description', `${h.title}, ${formatArea(h.area)} м²${h.mansard ? ` + мансарда ${formatArea(h.mansard)} м²` : ''}. ${e ? `${e.kind || 'Посёлок'} «${e.name}»` : ''}`.trim())}`,
        '  </offer>',
      ]
        .filter(Boolean)
        .join('\n')
    })

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<supplementing-metarealty-feed xmlns="http://webmaster.yandex.ru/schemas/feed/metarealty/2026-03">
  <generation-date>${new Date().toISOString().slice(0, 19)}+00:00</generation-date>
${offers.join('\n')}
</supplementing-metarealty-feed>
`
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' } })
}
