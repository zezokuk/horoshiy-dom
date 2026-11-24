import type { Metadata } from 'next'
import { getCompany, getHouses, getProjects, img, plural } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { cleanPhotoUrl, houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { HousePicker, type PickHouse, type PickProjectType } from '@/v3/home/HousePicker'
import { StickyCta } from '@/v3/home/StickyCta'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead } from '@/v4/Shell'
import '@/v3/v3.css'
import '@/v4/v4.css'

export const dynamic = 'force-dynamic'

function cleanHouseShortTitle(rawTitle: string, plotNo: number | null | undefined) {
  const [typePart, ...rest] = rawTitle.split(', ')
  const cleanStreet = rest
    .join(', ')
    .replace(/,?\s*уч\.?\s*\d+\s*[–-]\s*\d+/gi, '')
    .replace(/,?\s*уч\.?\s*\d+(?:\s*,\s*\d+)+/gi, '')
    .replace(/,?\s*\d+\s*[–-]\s*\d+$/g, '')
    .replace(/^уч\.\s*/i, '')
    .trim()
  const parts = [typePart]
  if (cleanStreet && !/^\d+$/.test(cleanStreet)) parts.push(cleanStreet)
  if (plotNo != null) parts.push(`уч. № ${plotNo}`)
  return parts.join(', ')
}

export async function generateMetadata(): Promise<Metadata> {
  const houses = (await getHouses({ status: 'free' })).map(houseView)
  const from = houses.length ? Math.min(...houses.map((h) => h.price)) : 0
  return {
    title: { absolute: `Купить готовый кирпичный дом с участком — ${houses.length} ${plural(houses.length, 'дом', 'дома', 'домов')} в продаже${from ? ` от ${formatMillions(from)}` : ''} · Хороший дом` },
    description: 'Готовые кирпичные дома с участком в собственных посёлках на Юге России (Динская, Новая Адыгея) и 15+ планировок: цены и статусы из прайса застройщика.',
    robots: { index: false, follow: false },
    alternates: { canonical: '/catalog' },
  }
}

export default async function V4Catalog() {
  const [company, houses, projects] = await Promise.all([getCompany(), getHouses({ status: 'free' }), getProjects()])
  const free = houses.map(houseView).sort((a, b) => a.price - b.price)
  const pick: PickHouse[] = free.map((h) => ({
    code: h.code,
    title: cleanHouseShortTitle(h.title, h.plotNo),
    area: h.area,
    plot: h.plot,
    price: h.price,
    estate: h.estateName,
    photo: h.photoCard ?? h.photo,
    href: `/v4/dom/${h.code}`,
    caption: 'Изображение проекта',
  }))

  const projectOf = (h: (typeof houses)[number]) => (typeof h.project === 'object' ? h.project?.id : h.project)
  const projectTypes: PickProjectType[] = projects
    .map((p) => {
      const mine = free.filter((h) => {
        const raw = houses.find((x) => x.code === h.code)
        return raw ? projectOf(raw) === p.id : false
      })
      const prices = mine.map((h) => h.price).filter((x) => x > 0)
      const numMatch = p.name.match(/\d+/)
      const byEstate = new Map<string, number>()
      mine.forEach((h) => byEstate.set(h.estateName, (byEstate.get(h.estateName) ?? 0) + 1))
      const estatesSummary = [...byEstate.entries()]
        .map(([name, cnt]) => `${name} (${cnt})`)
        .join(', ')
      return {
        slug: p.slug,
        num: numMatch ? Number(numMatch[0]) : 99,
        name: p.name,
        area: p.area ?? null,
        bedrooms: p.bedrooms ?? null,
        storeys: p.storeys === 2 ? '2 этажа' : p.mansard ? '1 этаж + мансарда' : '1 этаж',
        photo: cleanPhotoUrl(img(p.photo, 'wide')),
        plan: img(p.plan, 'wide'),
        free: mine.length,
        fromPrice: prices.length ? Math.min(...prices) : null,
        href: `/v4/proekt/${p.slug}`,
        estatesSummary: estatesSummary || undefined,
      }
    })
    .sort((a, b) => Number(b.free > 0) - Number(a.free > 0) || a.num - b.num)

  const places = [...new Set(free.map((h) => h.estateName))]
  return (
    <div className="v3 v4">
      <V4Fonts />
      <V4Bar phone={company.phone} always />
      <MotionRoot>
        <V4PageHead
          eyebrow="Каталог домов и проектов"
          ghost="Дома"
          title="Дома в продаже"
          em="и планировки"
          lead={`${free.length} ${plural(free.length, 'готовый кирпичный дом', 'готовых кирпичных дома', 'готовых кирпичных домов')} с участком (${places.join(', ')}) и 15+ собственных планировок. Выберите типовой проект или подберите готовый дом по посёлку.`}
        />
        <section className="v3-sec v4-sec" style={{ paddingTop: 0 }}>
          <div className="v3-wrap">
            <HousePicker houses={pick} projectTypes={projectTypes} catalogHref="/v4/doma" grid typeFilter />
          </div>
        </section>
        <V4Final company={company} context="Каталог v4: запись на показ" />
        <V4Footer since={company.since} phone={company.phone} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
