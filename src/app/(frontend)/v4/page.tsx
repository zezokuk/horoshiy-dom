import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getCompany, getEstates, getHouses, getProjects, getRegions, img, plural } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { JsonLd, faqLd, organizationLd } from '@/lib/seo'
import { byEstateStatus, estateSale, estateView, houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { HomeTypeShowcase, type ShowcaseType } from '@/v4/HomeTypeShowcase'
import { HouseStory3D, type WalkStop } from '@/v4/HouseStory3D'
import { MapGenplanFlow, type FlowEstate } from '@/v4/MapGenplanFlow'
import { Mortgage, type MortgageHouse } from '@/v4/Mortgage'
import { V4Bar, V4Final, V4Fonts, V4Footer, telOf } from '@/v4/Shell'
import { V4Motion } from '@/v4/V4Motion'
import { WALK, v4img } from '@/v4/images'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 — финальная архитектура главной по UX/UI Figma («задача», 19.11):
 *   1. Единая бесшовная сцена (в одном sticky-контейнере без лишних кадров и долгой прокрутки):
 *      Ночь → яркая падающая звезда → тёплые огни в доме → рассвет → мягкий 0.8с переход в 3D на белом фоне →
 *      «О нас» (278-842) → 4 учредителя «Наша команда» (278-884) → въезд камеры ТОЧНО В ВХОДНУЮ ДВЕРЬ →
 *      СРАЗУ «про нас» и плавная пролётка внутри дома (278-829) с рассказом о компании
 *   2. Типы готовых домов 1..12 с фильтрами в стиле ПИК (278-904)
 *   3. Карта посёлков (без наложения пинов) + Спутниковый генплан Динской 36 участков (278-948..1246)
 *   4. Ипотечный калькулятор (278-1702)
 *   5. Запись на показ + 3 карточки контактов (278-1658) + подвал (278-1791)
 */
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

function Head({ n, label, ghost, children, lead }: { n: string; label: string; ghost: string; children: ReactNode; lead?: ReactNode }) {
  return (
    <>
      <span className="v4-ghost" aria-hidden>{ghost.toLowerCase()}</span>
      <div className="v3-wrap v4-head">
        <p className="v4-num">{n ? <><b>{n}</b> / </> : null}{label}</p>
        <h2 className="v3-h2" data-move="lines">{children}</h2>
        {lead && <p className="v3-lead" data-move="up">{lead}</p>}
      </div>
    </>
  )
}

export default async function V4Home() {
  const [company, estates, houses, projects, regions] = await Promise.all([getCompany(), getEstates(), getHouses(), getProjects(), getRegions()])
  const allHouses = houses.map(houseView)
  const free = allHouses.filter((h) => h.status === 'free').sort((a, b) => a.price - b.price)
  const priceFrom = free.find((h) => h.price > 0)?.price
  const projectOf = (h: (typeof houses)[number]) => (typeof h.project === 'object' ? h.project?.id : h.project)
  const estateOf = (h: (typeof houses)[number]) => (typeof h.estate === 'object' ? h.estate?.id : h.estate)

  // Типы проектов для витрины 1..12 (Figma 278-904)
  const showcaseTypes: ShowcaseType[] = projects
    .map((p) => {
      const mine = houses.filter((h) => h.status === 'free' && projectOf(h) === p.id)
      const prices = mine.map((h) => h.price ?? 0).filter((x) => x > 0)
      const areas = mine.map((h) => h.area ?? 0).filter((x) => x > 0)
      const plots = mine
        .map((h) => Number.parseFloat((h.plot ?? '').replace(',', '.')))
        .filter((x) => Number.isFinite(x) && x > 0)
      const mineViews = mine.map(houseView)
      const numMatch = p.name.match(/\d+/)
      return {
        slug: p.slug,
        num: numMatch ? Number(numMatch[0]) : 99,
        name: p.name,
        area: p.area ?? null,
        mansard: p.mansard ?? null,
        storeys: p.storeys ?? null,
        bedrooms: p.bedrooms ?? null,
        bathrooms: p.bathrooms ?? null,
        photo: img(p.photo, 'wide'),
        plan: img(p.plan, 'wide'),
        free: mine.length,
        fromPrice: prices.length ? Math.min(...prices) : null,
        minArea: areas.length ? Math.min(...areas) : null,
        maxArea: areas.length ? Math.max(...areas) : null,
        minPlot: plots.length ? Math.min(...plots) : null,
        maxPlot: plots.length ? Math.max(...plots) : null,
        estates: [...new Set(mineViews.map((x) => x.estateName).filter(Boolean))],
        href: `/v4/proekt/${p.slug}`,
      }
    })
    .sort((a, b) => a.num - b.num)

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

  // Рассказ про компанию внутри дома (Figma 278-829): включается сразу при въезде в дверь без лишнего пустого кадра
  const tip5 = projects.find((p) => p.slug === 'tip-5')
  const room = (name: string) => (tip5?.rooms ?? []).find((x) => x.name === name)
  const m2 = (a?: number) => (a ? `${a.toLocaleString('ru-RU')} м²` : undefined)
  const walkStops: WalkStop[] = [
    {
      code: 'К1',
      tab: 'Кто строит',
      title: 'Свои посёлки и свои проекты с 2014 года',
      text: 'Мы не перепродаём чужие стройки. СК «Хороший дом» сама выбирает землю в Динской, Новой Адыгее и Козете, строит по 12 собственным проектам из сертифицированного кирпича и отвечает за результат лично.',
      alt: 'Крыльцо «Типа 5»: входная дверь открыта, за ней светлый холл',
      src: v4img('К1')?.src ?? '/v4/img/in-porch.webp',
      phone: v4img('К1')?.phone,
    },
    {
      code: 'К2',
      tab: 'В цене дома',
      title: 'Предчистовая отделка и инженерия без доплат',
      text: 'В цену уже входят штукатурка стен по маякам, разводка электрики и отопления, электрокотёл, скважина, септик до 9 м³, 15 кВт, газ по меже, отмостка, паркоместо из плитки и ворота.',
      alt: 'Прихожая: шкафы вдоль стены, впереди выход в кухню-гостиную',
      src: v4img('К2')?.src ?? '/v4/img/in-hall.webp',
      phone: v4img('К2')?.phone,
    },
    {
      code: 'И1',
      tab: 'Качество',
      title: 'Продуманные планировки и гарантия 5 лет',
      area: m2(room('Кухня-гостиная')?.area),
      text: 'Кухня-гостиная без лишних перегородок, мастер-спальня и панорамный свет — так проектируется каждый наш дом. На капитальные конструкции даём официальную гарантию 5 лет.',
      alt: 'Кухня-гостиная утром: диван, стол на шестерых, кухня вдоль стены',
      src: v4img('И1')?.src ?? '/v4/img/in-kitchen.webp',
      phone: v4img('И1')?.phone,
    },
    {
      code: 'И2',
      tab: 'Сделка',
      title: 'Готовые дома от застройщика и семейная ипотека 6%',
      area: m2(room('Терраса')?.area),
      text: 'Собственная терраса, свой двор и переезд без долгостроя. Бронь 100 000 ₽ фиксирует цену дома, принимаем маткапитал и помогаем с одобрением в банке. Выберите свой проект ниже.',
      alt: 'Терраса: стол для завтрака, газон за ступенями',
      src: v4img('И2')?.src ?? '/v4/img/in-terrace.webp',
      phone: v4img('И2')?.phone,
    },
  ]
  const walkVideo = WALK.src ? { ...WALK, src: WALK.src } : undefined

  const builtEstates = estates.filter((e) => e.status !== 'planned').length
  const soldEstates = estates.filter((e) => e.status === 'soldOut')
  const soldHomesSum = soldEstates.reduce((s, e) => s + (e.homes ?? 0), 0)
  const facts = [
    company.since ? { v: String(company.since), l: 'первый таунхаус' } : null,
    soldHomesSum ? { v: String(soldHomesSum), l: `дома построено и продано в ${soldEstates.map((s) => `«${s.name}»`).join(' и ')}` } : null,
    { v: String(builtEstates), l: `${plural(builtEstates, 'посёлок', 'посёлка', 'посёлков')} под Краснодаром` },
    { v: String(projects.length), l: `${plural(projects.length, 'собственный проект', 'собственных проекта', 'собственных проектов')}` },
    { v: '5 лет', l: 'гарантия на капитальные дефекты' },
  ].filter((f): f is { v: string; l: string } => f !== null)

  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }
  const mortHouses: MortgageHouse[] = free.map((h) => ({ code: h.code, label: `${h.title}, ${h.estateName}`, price: h.price }))

  const faq = company.faq ?? []
  const tel = telOf(company.phone)

  return (
    <div className="v3 v4">
      <V4Fonts />
      <JsonLd data={organizationLd(company, regions)} />
      {faqLd(faq as typeof company.faq) && <JsonLd data={faqLd(faq as typeof company.faq)!} />}
      <V4Bar phone={company.phone} />

      <MotionRoot>
        <V4Motion />

        {/* 1 → 2 → 3 в одном sticky-контейнере: Ночь/Утро → 3D-дом («О нас» + 4 учредителя) → въезд в дверь + пролётка «про нас» */}
        <HouseStory3D
          facts={facts}
          walkStops={walkStops}
          walkVideo={walkVideo}
          phone={company.phone ?? undefined}
          tel={tel ?? undefined}
          priceFrom={priceFrom ? formatMillions(priceFrom) : undefined}
          nightSrc={v4img('НОЧЬ')?.src}
          nightPhone={v4img('НОЧЬ')?.phone}
        />

        {/* 4. Типы готовых домов 1..12 с фильтрами в стиле ПИК (Figma 278-904) */}
        {showcaseTypes.length > 0 && (
          <section className="v3-sec v4-sec v4-sec--types" id="tipy">
            <Head
              n="04"
              label="Проекты домов"
              ghost="типы"
              lead="Одноэтажные, с мансардой и двухэтажные. Выберите номер типа или подберите по участку и числу спален."
            >
              Типы <em>готовых домов</em>
            </Head>
            <div className="v3-wrap">
              <HomeTypeShowcase types={showcaseTypes} />
            </div>
          </section>
        )}

        {/* 5. Карта посёлков (наведение → справка, клик → приближение → Смотреть посёлок) */}
        {flowEstates.length > 0 && (
          <section className="v3-sec v3-sec--mist v4-sec v4-sec--map" id="karta">
            <span id="poselki" />
            <Head
              n="05"
              label="Посёлки на карте"
              ghost="карта"
              lead="Наведите на посёлок для справки, нажмите — карта приблизится, и откройте страницу посёлка с генпланом и типами домов."
            >
              Выбрать посёлок <em>на карте</em>
            </Head>
            <div className="v3-wrap" data-move="up">
              <MapGenplanFlow estates={flowEstates} />
            </div>
          </section>
        )}

        {/* 6. Ипотечный калькулятор (Figma 278-1702) */}
        <section className="v3-sec v4-sec v4-sec--mort" id="ipoteka">
          <Head
            n="06"
            label="Ипотека"
            ghost="ипотека"
            lead="Семейная ипотека 6%, IT-ипотека и маткапитал во взнос. Рассчитайте ориентировочный платёж для любого дома."
          >
            Ипотека <em>на дом</em>
          </Head>
          <div className="v3-wrap" data-move="up">
            {mortHouses.length > 0 && <Mortgage houses={mortHouses} family={fam} />}
            <div className="v4-mort-more">
              <a className="v4-pik-btn" href="/v4/ipoteka">Все программы, 5 шагов сделки и частые вопросы →</a>
              <a className="v4-pik-btn" href="/v4/o-kompanii">Подробнее о компании и учредителях →</a>
            </div>
          </div>
        </section>

        {/* 7. Вечерний финал (рифма к рассвету, как в коммерческом визуале Клода) + 3 карточки контактов + Футер */}
        <V4Final company={company} n="07" context="Главная v4: запись на показ" bg={v4img('И4')?.src ?? '/design/hero-morning.webp'} showContacts />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
