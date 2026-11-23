import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getCompany, getEstates, getHouses, getProjects, getRegions } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { JsonLd, faqLd, organizationLd } from '@/lib/seo'
import { byEstateStatus, estateSale, estateView, houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import BuyerHero from '@/v4/BuyerHero'
import { HouseWalk } from '@/v4/HouseWalk'
import { FeaturedHouses, type FeaturedHouse } from '@/v4/FeaturedHouses'
import { housePhotography } from '@/v4/housePhotography'
import { MapGenplanFlow, type FlowEstate } from '@/v4/MapGenplanFlow'
import { Mortgage, type MortgageHouse } from '@/v4/Mortgage'
import { V4Bar, V4Final, V4Fonts, V4Footer } from '@/v4/Shell'
import { V4Motion } from '@/v4/V4Motion'
import { v4img } from '@/v4/images'
import '@/v3/v3.css'
import '@/v4/v4.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const houses = await getHouses()
  const prices = houses.filter((h) => h.status === 'free').map((h) => h.price ?? 0).filter((p) => p > 0)
  const from = prices.length ? ` от ${formatMillions(Math.min(...prices))}` : ''
  return {
    title: { absolute: 'Купить кирпичный дом с участком под Краснодаром — Хороший дом' },
    description: `Готовые кирпичные дома с участком в Динской и Новой Адыгее${from}. 12 проектов, семейная ипотека, предчистовая отделка, гарантия 5 лет. Строим с 2014 года.`,
    robots: { index: false, follow: false },
    alternates: { canonical: '/' },
  }
}

function Head({ children }: { children: ReactNode }) {
  return <div className="v3-wrap v4-head"><h2 className="v3-h2">{children}</h2></div>
}

const featuredCodes = ['di-tip5', 'di-tip6-v3', 'dr-tip10']

export default async function V4Home() {
  const [company, estates, houses, projects, regions] = await Promise.all([getCompany(), getEstates(), getHouses(), getProjects(), getRegions()])
  const allHouses = houses.map(houseView)
  const free = allHouses.filter((h) => h.status === 'free').sort((a, b) => a.price - b.price)
  const priceFrom = free.find((h) => h.price > 0)?.price
  const projectOf = (h: (typeof houses)[number]) => (typeof h.project === 'object' ? h.project?.id : h.project)
  const estateOf = (h: (typeof houses)[number]) => (typeof h.estate === 'object' ? h.estate?.id : h.estate)

  // Keep the editorial selection tied to live inventory. Sold or reserved homes fall out immediately.
  const selected = [
    ...featuredCodes.flatMap(code => free.filter(h => h.code === code)),
    ...free.filter(h => !featuredCodes.includes(h.code)),
  ].slice(0, 3)
  const featured: FeaturedHouse[] = selected.map(h => {
    const frames = housePhotography(h.code)
    // The listing opens on the masonry and porch; the detail opens on the complete facade.
    const shot = h.code === 'di-tip5' ? frames[1] ?? frames[0] : frames[0]
    const [type, ...address] = h.title.split(', ')
    return {
      code: h.code,
      location: [h.estateName, address.join(', ').replace('уч. ', 'участок ')].filter(Boolean).join(' · '),
      title: h.mansard ? 'Дом с мансардой' : h.storeys === 2 ? 'Двухэтажный дом' : 'Одноэтажный дом',
      price: h.price, area: h.area, plot: h.plot, mansard: h.mansard,
      image: shot?.src ?? h.photo,
      caption: shot?.caption ?? 'Изображение проекта',
      alt: shot?.alt ?? 'Дом по проекту «' + type + '»',
    }
  })

  // Посёлки для карты (наведение → справка, клик по Динской или вкладке → спутниковый генплан)
  const nearby = new Map(estates.map((e) => [String(e.slug), (e.nearby ?? []).map((x) => ({ label: x.label, value: x.value }))]))
  const typesByEstate = new Map<number, string[]>()
  for (const h of houses) {
    const eid = estateOf(h)
    const pid = projectOf(h)
    const pName = projects.find((p) => p.id === pid)?.name
    if (eid && pName) {
      const list = typesByEstate.get(eid) ?? []
      if (!list.includes(pName)) list.push(pName)
      typesByEstate.set(eid, list)
    }
  }
  const flowEstates: FlowEstate[] = byEstateStatus(estates.map((e) => estateView(e, houses)))
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => {
      const est = estates.find((x) => x.slug === c.slug)
      const tNames = (est ? typesByEstate.get(est.id) : undefined) ?? []
      tNames.sort((a, b) => (Number(a.match(/\d+/)?.[0]) || 99) - (Number(b.match(/\d+/)?.[0]) || 99))
      const freeMine = est ? houses.filter((h) => estateOf(h) === est.id && h.status === 'free') : []
      const single = c.status === 'selling' && c.free === 1 && c.slug !== 'dinskaya' && freeMine[0] ? freeMine[0] : undefined
      return {
        slug: c.slug,
        name: c.name,
        place: c.place,
        lat: c.lat!,
        lng: c.lng!,
        status: c.status,
        homes: c.homes,
        free: c.free,
        priceFrom: c.priceFrom,
        sale: `${estateSale(c)}${c.priceFrom && c.status === 'selling' ? ` · от ${formatMillions(c.priceFrom)}` : ''}`,
        href: `/v4/poselok/${c.slug}`,
        cover: c.coverCard || c.cover,
        types: tNames,
        nearby: nearby.get(c.slug) ?? [],
        singleHouse: single
          ? {
              code: single.code,
              title: single.title,
              area: single.area,
              plot: single.plot ?? null,
              price: single.price,
              href: `/v4/dom/${single.code}`,
            }
          : undefined,
      }
    })

  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }
  const mortHouses: MortgageHouse[] = free.map((h) => ({ code: h.code, label: `${h.title}, ${h.estateName}`, price: h.price }))

  const rooms = projects.find(p => p.slug === 'tip-5')?.rooms
  const walkAreas = [null, ...['Прихожая', 'Кухня-гостиная', 'Терраса'].map(name => rooms?.find(r => r.name === name)?.area ?? null)]
  const walkHouse = free.find(h => h.code === 'di-tip5')
  const faq = company.faq ?? []

  return (
    <div className="v3 v4">
      <V4Fonts />
      <JsonLd data={organizationLd(company, regions)} />
      {faqLd(faq as typeof company.faq) && <JsonLd data={faqLd(faq as typeof company.faq)!} />}
      <V4Bar phone={company.phone} />

      <MotionRoot>
        <V4Motion />

        <BuyerHero phone={company.phone} priceFrom={priceFrom ? formatMillions(priceFrom) : undefined} />
        <FeaturedHouses houses={featured} count={free.length} />
        <HouseWalk
          areas={walkAreas}
          href={walkHouse ? '/v4/dom/' + walkHouse.code : '/v4/proekt/tip-5'}
          linkText={walkHouse ? 'Посмотреть дом в Динской' : 'Посмотреть проект «Тип 5»'}
        />

        {flowEstates.length > 0 && (
          <section className="v3-sec v3-sec--mist v4-sec v4-sec--map" id="karta">
            <span id="poselki" />
            <Head>Посёлки <em>на карте</em></Head>
            <div className="v3-wrap" data-move="up">
              <MapGenplanFlow estates={flowEstates} />
            </div>
          </section>
        )}

        {/* 6. Ипотечный калькулятор (Figma 278-1702) */}
        <section className="v3-sec v4-sec v4-sec--mort" id="ipoteka">
          <Head>Рассчитать <em>ипотеку</em></Head>
          <div className="v3-wrap" data-move="up">
            {mortHouses.length > 0 && <Mortgage houses={mortHouses} family={fam} />}
            <div className="v4-mort-more">
              <a className="v4-pik-btn" href="/v4/ipoteka">Все программы, 5 шагов сделки и частые вопросы →</a>
              <a className="v4-pik-btn" href="/v4/o-kompanii">Подробнее о компании и учредителях →</a>
            </div>
          </div>
        </section>

        {/* 7. Вечерний финал (рифма к рассвету, как в коммерческом визуале Клода) + 3 карточки контактов + Футер */}
        <V4Final company={company} context="Главная v4: запись на показ" bg={v4img('И4')?.src ?? '/design/hero-morning.webp'} showContacts />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
