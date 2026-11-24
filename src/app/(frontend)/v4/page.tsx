import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getCompany, getEstates, getHouses, getProjects, getRegions } from '@/lib/data'
import { annuity, formatMillions } from '@/lib/format'
import { JsonLd, faqLd, organizationLd } from '@/lib/seo'
import { byEstateStatus, estateSale, estateView, houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import BuyerHero from '@/v4/BuyerHero'
import { CountryLifeStory } from '@/v4/CountryLifeStory'
import { HouseWalk } from '@/v4/HouseWalk'
import { FeaturedHouses, type FeaturedHouse } from '@/v4/FeaturedHouses'
import { housePhotography } from '@/v4/housePhotography'
import { MapGenplanFlow, type FlowEstate } from '@/v4/MapGenplanFlow'
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
    title: { absolute: 'Купить готовый кирпичный дом с участком в собственных посёлках — Хороший дом' },
    description: `Готовые кирпичные дома с участком на Юге России${from}: Динская, Новая Адыгея, Козет. 15+ планировок, 200+ построенных домов, семейная ипотека 6%, предчистовая отделка White Box, гарантия 5 лет. Строим с 2014 года.`,
    robots: { index: false, follow: false },
    alternates: { canonical: '/' },
  }
}

function Head({ children }: { children: ReactNode }) {
  return <div className="v3-wrap v4-head"><h2 className="v3-h2">{children}</h2></div>
}

const featuredCodes = ['di-tip5', 'di-tip6-v3', 'dr-tip10']

const MORTGAGE_PROGRAMS = [
  {
    badge: 'от 6% годовых',
    title: 'Семейная ипотека',
    text: 'Для семей с детьми до 6 лет включительно или двумя несовершеннолетними детьми. Лимит 6 млн ₽, срок до 30 лет.',
  },
  {
    badge: 'от 6% годовых',
    title: 'IT-ипотека',
    text: 'Для сотрудников аккредитованных IT-компаний. Пониженная ставка на покупку готового кирпичного дома с участком ИЖС.',
  },
  {
    badge: 'от 3% годовых',
    title: 'Сельская ипотека',
    text: 'Льготная программа на загородные территории и станицы. Помогаем проверить соответствие объекта и собрать пакет.',
  },
  {
    badge: 'по НИС',
    title: 'Военная ипотека',
    text: 'Покупка готового дома с использованием средств накопительно-ипотечной системы военнослужащих.',
  },
  {
    badge: 'в первый взнос',
    title: 'Материнский капитал',
    text: 'Можно направить материнский капитал полностью или частично в первоначальный взнос либо на досрочное погашение.',
  },
] as const

function estateCleanCover(slug: string): string {
  switch (slug) {
    case 'dinskaya':
      return '/v4/houses/type5-front.webp'
    case 'druzhby-43':
      return '/v4/houses/type10-front.webp'
    case 'krasnaya-39':
      return '/v4/img/slide-tip-3.webp'
    case 'novovelichkovskaya':
      return '/v4/houses/type6v3-front.webp'
    case 'yuzhnyy-veter':
      return '/v4/img/slide-tip-1.webp'
    case 'kalina':
      return '/v4/img/slide-tip-2.webp'
    default:
      return '/v4/houses/type5-front.webp'
  }
}

function cleanSingleAddress(rawTitle: string, estateName: string, plotNo: number | null | undefined): string {
  const [, ...rest] = rawTitle.split(', ')
  const street = rest
    .join(', ')
    .replace(/,?\s*уч\.?\s*\d+\s*[–-]\s*\d+/gi, '')
    .replace(/,?\s*уч\.?\s*\d+(?:\s*,\s*\d+)+/gi, '')
    .replace(/,?\s*\d+\s*[–-]\s*\d+$/g, '')
    .replace(/^уч\.\s*/i, 'участок № ')
    .trim()
  const parts = [estateName]
  if (street && !/^участок/i.test(street)) parts.push(street)
  if (plotNo != null) parts.push(`участок № ${plotNo}`)
  return parts.filter(Boolean).join(' · ')
}

export default async function V4Home() {
  const [company, estates, houses, projects, regions] = await Promise.all([getCompany(), getEstates(), getHouses(), getProjects(), getRegions()])
  const allHouses = houses.map(houseView)
  const free = allHouses.filter((h) => h.status === 'free').sort((a, b) => a.price - b.price)
  const priceFrom = free.find((h) => h.price > 0)?.price
  const projectOf = (h: (typeof houses)[number]) => (typeof h.project === 'object' ? h.project?.id : h.project)
  const estateOf = (h: (typeof houses)[number]) => (typeof h.estate === 'object' ? h.estate?.id : h.estate)

  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }

  // Подбираем 7 лучших свободных домов разных типов без повтора одного типа подряд
  const typeKey = (title: string) => title.split(',')[0].trim().toLowerCase()
  const pool = [
    ...featuredCodes.flatMap((code) => free.filter((h) => h.code === code)),
    ...free.filter((h) => !featuredCodes.includes(h.code)),
  ]
  const selected: typeof free = []
  const usedTypes = new Set<string>()
  for (const h of pool) {
    if (selected.length >= 7) break
    const tk = typeKey(h.title)
    if (!usedTypes.has(tk)) {
      usedTypes.add(tk)
      selected.push(h)
    }
  }
  for (const h of pool) {
    if (selected.length >= 7) break
    if (!selected.some((x) => x.code === h.code)) {
      const prev = selected[selected.length - 1]
      if (!prev || typeKey(prev.title) !== typeKey(h.title)) {
        selected.push(h)
      }
    }
  }

  const featured: FeaturedHouse[] = selected.map((h) => {
    const frames = housePhotography(h.code)
    const shot = h.code === 'di-tip5' ? frames[1] ?? frames[0] : frames[0]
    const [type] = h.title.split(', ')
    const need = h.price ? Math.max(fam.minDown, Math.ceil(((h.price - fam.limit) / h.price) * 100)) : fam.minDown
    const monthlyPay = h.price ? Math.round(annuity(h.price * (1 - need / 100), fam.rate, fam.years)) : null
    return {
      code: h.code,
      location: cleanSingleAddress(h.title, h.estateName, h.plotNo),
      title: h.mansard ? 'Дом с мансардой' : h.storeys === 2 ? 'Двухэтажный дом' : 'Одноэтажный дом',
      price: h.price,
      area: h.area,
      plot: h.plot,
      mansard: h.mansard,
      bedrooms: h.bedrooms,
      projectName: type,
      monthlyPay,
      familyRate: fam.rate,
      mortgageDown: need,
      mortgageYears: fam.years,
      image: shot?.src ?? h.photo,
      caption: shot?.caption ?? 'Изображение проекта',
      alt: shot?.alt ?? 'Дом по проекту «' + type + '»',
    }
  })

  // Посёлки для карты
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
        cover: estateCleanCover(c.slug),
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

  const rooms = projects.find((p) => p.slug === 'tip-5')?.rooms
  const walkAreas = [null, ...['Прихожая', 'Кухня-гостиная', 'Терраса'].map((name) => rooms?.find((r) => r.name === name)?.area ?? null)]
  const walkHouse = free.find((h) => h.code === 'di-tip5')
  const faq = company.faq ?? []

  return (
    <div className="v3 v4">
      <V4Fonts />
      <JsonLd data={organizationLd(company, regions)} />
      {faqLd(faq as typeof company.faq) && <JsonLd data={faqLd(faq as typeof company.faq)!} />}
      <V4Bar phone={company.phone} />

      <MotionRoot>
        <V4Motion />

        <BuyerHero priceFrom={priceFrom ? formatMillions(priceFrom) : undefined} />
        <FeaturedHouses houses={featured} count={free.length} />
        <HouseWalk
          areas={walkAreas}
          href={walkHouse ? '/v4/dom/' + walkHouse.code : '/v4/proekt/tip-5'}
          linkText={walkHouse ? 'Посмотреть дом в Динской' : 'Посмотреть проект «Тип 5»'}
        />
        <CountryLifeStory />

        {flowEstates.length > 0 && (
          <section className="v3-sec v3-sec--mist v4-sec v4-sec--map" id="karta">
            <span id="poselki" />
            <Head>Посёлки <em>на карте</em></Head>
            <div className="v3-wrap" data-move="up">
              <MapGenplanFlow estates={flowEstates} />
            </div>
          </section>
        )}

        {/* Ипотека: светлый понятный блок без тяжёлой плашки и выдуманных процентов */}
        <section className="v3-sec v4-sec v4-sec--mort" id="ipoteka">
          <Head>Ипотека <em>на дом</em></Head>
          <div className="v3-wrap v4-home-mort" data-move="up">
            <p className="v4-home-mort__intro">
              Работаем с льготными госпрограммами и стандартной ипотекой ведущих банков. Поможем выбрать выгодную ставку под вашу семью и бесплатно сопроводим подачу документов.
            </p>

            <ul className="v4-home-mort__grid" aria-label="Доступные программы ипотеки">
              {MORTGAGE_PROGRAMS.map((prog) => (
                <li key={prog.title} className="v4-home-mort__prog">
                  <div>
                    <span className="v4-home-mort__prog-badge">{prog.badge}</span>
                    <h3>{prog.title}</h3>
                  </div>
                  <p>{prog.text}</p>
                </li>
              ))}
            </ul>

            <div className="v4-home-mort__actions">
              <a className="v4-pik-btn v4-pik-btn--accent" href="/v4/ipoteka">
                <span>Рассчитать платёж →</span>
              </a>
              <a className="v4-pik-btn" href="#evf-form">
                <span>Подобрать программу под ваш случай</span>
              </a>
              <a className="v4-pik-btn" href="/v4/o-kompanii">
                <span>О компании и учредителях →</span>
              </a>
            </div>
          </div>
        </section>

        <V4Final company={company} context="Главная v4: запись на показ" bg={v4img('И4')?.src ?? '/design/hero-morning.webp'} showContacts />
        <V4Footer since={company.since} phone={company.phone} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
