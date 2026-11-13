import type { Metadata } from 'next'
import { getCompany, getHouses, plural } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { HousePicker, type PickHouse } from '@/v3/home/HousePicker'
import { StickyCta } from '@/v3/home/StickyCta'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead } from '@/v4/Shell'
import '@/v3/v3.css'
import '@/v4/v4.css'

/** v4 · каталог «Дома в продаже» (черновик, 13.11): все свободные дома сеткой, фильтр по посёлку и бюджету — из главной. */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const houses = (await getHouses({ status: 'free' })).map(houseView)
  const from = houses.length ? Math.min(...houses.map((h) => h.price)) : 0
  return {
    title: { absolute: `Купить дом с участком под Краснодаром — ${houses.length} ${plural(houses.length, 'дом', 'дома', 'домов')} в продаже${from ? ` от ${formatMillions(from)}` : ''} · Хороший дом` },
    description: 'Готовые кирпичные дома с участком в Динской и Новой Адыгее: цены и статусы из прайса застройщика, фильтр по посёлку и бюджету, показ вживую.',
    robots: { index: false, follow: false },
    alternates: { canonical: '/catalog' },
  }
}

export default async function V4Catalog() {
  const [company, houses] = await Promise.all([getCompany(), getHouses({ status: 'free' })])
  const free = houses.map(houseView).sort((a, b) => a.price - b.price)
  const pick: PickHouse[] = free.map((h) => ({
    code: h.code, title: h.title, area: h.area, plot: h.plot, price: h.price, estate: h.estateName,
    photo: h.photoCard ?? h.photo, href: `/v4/dom/${h.code}`, caption: 'Изображение проекта',
  }))
  const places = [...new Set(free.map((h) => h.estateName))]
  return (
    <div className="v3 v4">
      <V4Fonts />
      <V4Bar phone={company.phone} always />
      <MotionRoot>
        <V4PageHead eyebrow="Дома в продаже" ghost="Дома" title="Готовые дома" em="в продаже"
          lead={`${free.length} ${plural(free.length, 'кирпичный дом', 'кирпичных дома', 'кирпичных домов')} с участком: ${places.join(', ')}. Цены и статусы — из прайса застройщика.`} />
        <section className="v3-sec v4-sec" style={{ paddingTop: 0 }}>
          <div className="v3-wrap v3-wrap--wide"><HousePicker houses={pick} catalogHref="/v4/doma" grid /></div>
        </section>
        <V4Final company={company} context="Каталог v4: запись на показ" />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
