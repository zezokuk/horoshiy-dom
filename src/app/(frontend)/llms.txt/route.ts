import { getCompany, getEstates, getHouses, getProjects, getRegion, getRegions } from '@/lib/data'
import { formatArea, plural } from '@/lib/format'
import { houseLine } from '@/lib/seo'
import { mainHref, regionFromHost, regionHref } from '@/lib/site'
import { houseView } from '@/lib/view'
import type { Region } from '@/payload-types'

/**
 * GEO: /llms.txt — a plain-text brief for AI assistants (ChatGPT, Алиса, Perplexity), so a question like
 * «где купить дом под Краснодаром» gets correct facts, prices and links. Built from the admin on every request:
 *   main domain → the company, every public region with its estates and free houses, projects, FAQ;
 *   krd.домен   → the same for this region only;
 *   msk.домен («скоро») → the company and the waitlist, no houses invented.
 * The proxy skips paths with an extension, so this one route answers on every host and reads the Host header.
 */
export async function GET(req: Request) {
  const slug = regionFromHost(req.headers.get('host'))
  const only = slug ? await getRegion(slug) : null
  if (slug && !only) return new Response('Not found', { status: 404 })

  const [company, regions, projects] = await Promise.all([getCompany(), getRegions(), getProjects()])
  const shown = only ? [only] : regions
  const active = regions.filter((r) => r.status === 'active').map((r) => r.name)
  const soon = regions.filter((r) => r.status === 'soon').map((r) => r.name)

  const out: string[] = [
    `# ${company.name}${only ? ` — ${only.name}` : ''}`,
    '',
    `> Строительная компания${company.since ? ` с ${company.since} года` : ''}: капитальные кирпичные дома с участком — готовые и под ключ по ${projects.length} ${plural(projects.length, 'проекту', 'проектам', 'проектам')}.` +
      `${active.length ? ` Продаём: ${active.join(', ')}.` : ''}${soon.length ? ` Скоро: ${soon.join(', ')}.` : ''}` +
      ' Дом под ключ за 6 месяцев, гарантия 5 лет, ипотека и регистрация за 2 недели.',
    '',
  ]
  const contact = (r?: Region | null) => {
    const phone = r?.office?.phone || company.phone
    return [
      phone && `- Телефон: ${phone}`,
      (r?.office?.email || company.email) && `- Почта: ${r?.office?.email || company.email}`,
      r?.office?.address && `- Офис: ${r.office.address}${r.office.hours ? `. ${r.office.hours}` : ''}`,
      company.telegram && `- Telegram: ${company.telegram}`,
    ].filter(Boolean) as string[]
  }
  out.push(...contact(only?.status === 'active' ? only : regions.find((r) => r.status === 'active')))
  if (company.mortgage?.length) out.push(`- Ипотека: ${company.mortgage.map((m) => m.title).join(', ')}`)
  // a «скоро» region has no catalog of its own (404): point to the company-wide one
  out.push(`- Каталог свободных домов: ${only?.status === 'active' ? regionHref(only.slug, '/catalog') : mainHref('/catalog')}`)
  out.push(`- Построить дом по проекту: ${mainHref('/build')}`)

  for (const r of shown) {
    out.push('', `## ${r.status === 'soon' ? 'Скоро: ' : ''}${r.name}`, `Страница: ${regionHref(r.slug)}`)
    if (r.status === 'soon') {
      out.push(`${r.intro || r.tagline || 'Готовим проекты.'} Домов в продаже пока нет — открыт лист ожидания: ${regionHref(r.slug)}#lead`)
      continue
    }
    const [estates, houses] = await Promise.all([getEstates(r.id), getHouses({ region: r.id })])
    for (const e of estates) {
      const mine = houses.filter((h) => (typeof h.estate === 'object' ? h.estate?.id : h.estate) === e.id).map(houseView)
      const free = mine.filter((h) => h.status === 'free')
      out.push('', `### ${e.kind || 'Посёлок'} «${e.name}»${e.place ? ` — ${e.place}` : ''}`)
      const about = [e.tagline, e.description].filter(Boolean).join('. ')
      if (about) out.push(about)
      out.push(`Страница: ${regionHref(r.slug, `/objects/${e.slug}`)}`)
      if (e.nearby?.length) out.push(`Рядом: ${e.nearby.map((n) => `${n.label} — ${n.value}`).join('; ')}.`)
      if (e.utilities?.length) out.push(`Коммуникации: ${e.utilities.join(', ')}.`)
      out.push(
        free.length
          ? `Свободно ${free.length} ${plural(free.length, 'дом', 'дома', 'домов')}${mine.length > free.length ? ` из ${mine.length}` : ''}:`
          : 'Свободных домов сейчас нет.',
      )
      out.push(...free.map(houseLine))
    }
  }

  if (!only && projects.length) {
    out.push('', '## Проекты домов (строим под ключ)')
    out.push(
      ...projects.map(
        (p) => `- ${p.name}: ${p.area ? `${formatArea(p.area)} м²` : 'площадь по проекту'}${p.mansard ? ` + мансарда ${formatArea(p.mansard)} м²` : ''}${p.bedrooms ? `, ${p.bedrooms} ${plural(p.bedrooms, 'спальня', 'спальни', 'спален')}` : ''}: ${mainHref(`/projects/${p.slug}`)}`,
      ),
    )
  }
  if (company.faq?.length) out.push('', '## Частые вопросы', ...company.faq.flatMap((f) => ['', `**${f.q}**`, f.a]))

  return new Response(out.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  })
}
