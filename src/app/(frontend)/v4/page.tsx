import type { Metadata } from 'next'
import type { CSSProperties, ReactNode } from 'react'
import { HeroNight, type HeroSlide } from '@/components/heroes/HeroNight'
import { PlotPicker, type PlotEstate } from '@/components/home/PlotPicker'
import { getCompany, getEstates, getHouses, getProjects, getRegions, img, plural } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { JsonLd, faqLd, organizationLd } from '@/lib/seo'
import { byEstateStatus, estateSale, estateView, genplanEstate, houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { HousePicker, type PickHouse } from '@/v3/home/HousePicker'
import { StickyCta } from '@/v3/home/StickyCta'
import { EstateMap, type MapEstate } from '@/v4/EstateMap'
import { Inside, type InsideStop } from '@/v4/Inside'
import { Mortgage, type MortgageHouse } from '@/v4/Mortgage'
import { TypeList, type TypeView } from '@/v4/TypeList'
import { V4Bar, V4Final, V4Fonts, V4Footer, telOf } from '@/v4/Shell'
import { V4Motion } from '@/v4/V4Motion'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 — главная по сюжету «от желания до ключей, за один день» (13.11, `11-Хороший-дом-с-нуля/17-Сторителлинг-и-тексты.md`).
 * Начало — из v2 (ночь → звезда → окна → рассвет), шрифты и цвета — из v3, движения — Aurus, «Внутри» — Villa Aurelia,
 * номера разделов, цитата и название в подвале — кейс «Чехов». Каждый раздел — час дня и один вопрос покупателя:
 *
 *   ночь → рассвет (HeroNight)            Куда я попал? Это реально?
 *   01 · 07:00  дома в продаже             Что можно купить сейчас и за сколько?
 *   02 · 09:00  проекты домов              Какие дома бывают?
 *   03 · 11:00  посёлки на карте Яндекса   Где это и сколько ехать?
 *   04 · 13:00  генплан в 3D               Какой участок мой?
 *   порог: «Зайдите внутрь» + Чехов
 *   05 · 07:30–22:00 внутри «Типа 5»       Как в нём жить?
 *   06  почему покупают у нас              Кому доверить деньги?
 *   07  как купить: пять шагов             Как это происходит?
 *   08  ипотека с расчётом                 Сколько платить в месяц?
 *       частые вопросы (AEO)               А как же…?
 *   09 · вечер  запись на показ            Что дальше?
 * Тексты — только факты из админки, прайса 27.10 и слова клиента; без «уникальный» и «не просто…, а…».
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const houses = await getHouses()
  const prices = houses.filter((h) => h.status === 'free').map((h) => h.price ?? 0).filter((p) => p > 0)
  const from = prices.length ? ` от ${formatMillions(Math.min(...prices))}` : ''
  return {
    title: { absolute: 'Купить кирпичный дом с участком под Краснодаром — Хороший дом' },
    description: `Готовые кирпичные дома с участком в Динской и Новой Адыгее${from}. 12 проектов, семейная ипотека, предчистовая отделка, гарантия 5 лет. Строим с 2014 года.`,
    // черновик: закрыт от поиска, пока главная не переедет на «/»
    robots: { index: false, follow: false },
    alternates: { canonical: '/' },
  }
}

const NAME = 'ХОРОШИЙ ДОМ'

// предчистовая отделка и коммуникации — дословно по прайсу клиента 27.10.2026
const INCLUDED = ['Разводка электричества и отопления', 'Электрический котёл', 'Штукатурка стен по маякам', 'Ворота: откатные или распашные', 'Отмостка и паркоместо из плитки', 'Скважина', '15 кВт на дом', 'Газ по меже участка', 'Септик до 9 м³']

const STEPS = [
  { t: 'Показ', d: 'Вживую в посёлке или по видеосвязи, если вы в другом городе.' },
  { t: 'Бронь', d: '100 000 ₽ — дом снимается с продажи, пока готовятся документы.' },
  { t: 'Оплата', d: 'Ипотека, материнский капитал во взнос, наличные или рассрочка — индивидуально.' },
  { t: 'Сделка', d: 'Договор и регистрация права собственности. Поможем собрать документы для банка.' },
  { t: 'Ключи', d: 'Дом в предчистовой отделке, коммуникации на участке. Гарантия 5 лет.' },
]

/** Заголовок раздела: номер и час дня, за ними огромное бледное слово, заголовок капителью с курсивным словом. */
function Head({ n, label, ghost, children, lead }: { n: string; label: string; ghost: string; children: ReactNode; lead?: ReactNode }) {
  return (
    <>
      <span className="v4-ghost" aria-hidden>{ghost}</span>
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
  const free = houses.filter((h) => h.status === 'free').map(houseView).sort((a, b) => a.price - b.price)
  const priceFrom = free.find((h) => h.price > 0)?.price
  const projectOf = (h: (typeof houses)[number]) => (typeof h.project === 'object' ? h.project?.id : h.project)

  // first screen from v2: by day it is a slider of the types on sale (the project's real photo, area, lowest price)
  const heroSlides: HeroSlide[] = projects
    .map((p) => {
      const mine = houses.filter((h) => h.status === 'free' && projectOf(h) === p.id)
      const from = Math.min(...mine.map((h) => h.price ?? 0).filter((x) => x > 0))
      const src = img(p.photo, 'wide')
      if (!mine.length || !src || p.name === 'Тип 5' || p.name === 'Тип 12') return null
      const meta = [p.area ? `${p.area.toLocaleString('ru-RU')} м²` : null, Number.isFinite(from) ? `от ${formatMillions(from)}` : null].filter(Boolean).join(' · ')
      return { title: p.name, meta, src, href: `/v4/proekt/${p.slug}` }
    })
    .filter((s): s is HeroSlide => s !== null)
    .slice(0, 5)

  // 02 · проекты: every project with its photo, on sale first (cheapest first), the rest after
  const types: TypeView[] = projects
    .map((p) => {
      const mine = houses.filter((h) => h.status === 'free' && projectOf(h) === p.id)
      const prices = mine.map((h) => h.price ?? 0).filter((x) => x > 0)
      return {
        slug: p.slug, name: p.name, area: p.area ?? null, storeys: p.storeys ?? null, bedrooms: p.bedrooms ?? null,
        photo: img(p.photo, 'wide'), thumb: img(p.photo, 'card'), free: mine.length, from: prices.length ? Math.min(...prices) : null,
        href: `/v4/proekt/${p.slug}`,
      }
    })
    .filter((t) => t.photo)
    .sort((a, b) => Number(b.free > 0) - Number(a.free > 0) || (a.from ?? Infinity) - (b.from ?? Infinity))
  const areas = types.map((t) => t.area ?? 0).filter((x) => x > 0)

  // 01 · дома в продаже. Карточка ведёт на страницу дома в виде v4 (черновик), v2-страница остаётся по старому адресу
  const pick: PickHouse[] = free.map((h) => ({
    code: h.code, title: h.title, area: h.area, plot: h.plot, price: h.price, estate: h.estateName,
    photo: h.photoCard ?? h.photo, href: `/v4/dom/${h.code}`, caption: 'Изображение проекта',
  }))
  const placesOnSale = [...new Set(free.map((h) => h.estateName))]

  // 03 · карта: every estate with coordinates, on sale first; «рядом» lines from the admin go into the green card
  const nearby = new Map(estates.map((e) => [String(e.slug), (e.nearby ?? []).map((x) => ({ label: x.label, value: x.value }))]))
  const mapEstates: MapEstate[] = byEstateStatus(estates.map((e) => estateView(e, houses)))
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => ({
      slug: c.slug, name: c.name, place: c.place, lat: c.lat!, lng: c.lng!, status: c.status, href: `/v4/poselok/${c.slug}`, cover: c.coverCard || c.cover,
      sale: `${estateSale(c)}${c.priceFrom && c.status === 'selling' ? ` · от ${formatMillions(c.priceFrom)}` : ''}`,
      nearby: nearby.get(c.slug) ?? [],
    }))
  const builtEstates = estates.filter((e) => e.status !== 'planned').length

  // 04 · 3D
  const plots: PlotEstate[] = estates
    .map((e) => {
      const mine = houses.filter((h) => (typeof h.estate === 'object' ? h.estate?.id : h.estate) === e.id).map(houseView)
      return { e, mine, free: mine.filter((h) => h.status === 'free').length }
    })
    .filter((x) => x.free > 0 && x.e.status !== 'planned')
    .sort((a, b) => b.free - a.free)
    .map(({ e, mine }) => ({ name: e.name, href: estateView(e, houses).href, estate: genplanEstate(e, mine.length), houses: mine }))

  // 05 · внутри «Типа 5»: площади и точки комнат — из планировки проекта в админке
  const tip5 = projects.find((p) => p.slug === 'tip-5')
  const plan = img(tip5?.render, 'wide')
  const room = (name: string, nth = 0) => {
    const r = (tip5?.rooms ?? []).filter((x) => x.name === name)[nth]
    return r ? { x: r.x, y: r.y, area: r.area } : undefined
  }
  const m2 = (a?: number) => (a ? `${a.toLocaleString('ru-RU')} м²` : undefined)
  const kitchen = room('Кухня-гостиная')
  const terrace = room('Терраса')
  const bed1 = room('Спальня', 1) ?? room('Спальня')
  const bed2 = room('Спальня', 0)
  const guest = room('Гостевая')
  const tip5Plot = houses.find((h) => h.status === 'free' && projectOf(h) === tip5?.id)?.plot?.replace(/\s*сот\.?$/, ' сотки')
  const stops: InsideStop[] = [
    { time: '07:30', word: 'ритм', title: 'Кухня-гостиная', area: m2(kitchen?.area), room: kitchen, cap: 'Вид сверху по планировке «Тип 5», мебель для примера',
      text: 'Кухня и гостиная — одно пространство. Пока варится кофе, видно и стол, и детей на диване.' },
    { time: '08:30', title: 'Терраса', area: m2(terrace?.area), room: terrace, src: '/design/morning-breakfast.webp', cap: 'Иллюстрация',
      text: 'Тихий завтрак на воздухе — на своей террасе, а не на общем балконе.' },
    { time: '15:00', word: 'чувство', title: 'Свой газон', area: tip5Plot ? `участок ${tip5Plot}` : undefined, src: '/design/scenes/lawn.webp', cap: 'Иллюстрация',
      text: 'Дети с поливалкой, собака рядом. Ворота и паркоместо из плитки уже сделаны.' },
    { time: '20:30', word: 'воздух', title: 'Вечер на участке', src: '/v3/sunset.webp', cap: 'Фото построенного дома',
      text: 'Мангал на газоне, тёплый свет в окнах. Вечер без соседей за стенкой.' },
    { time: '22:00', title: 'Спальни', area: [bed1, bed2].every(Boolean) ? `${m2(bed1!.area)} и ${m2(bed2!.area)}${guest ? ` + гостевая ${m2(guest.area)}` : ''}` : undefined,
      room: bed1, cap: 'Вид сверху по планировке «Тип 5», мебель для примера',
      text: 'Тишина здесь — это чувство контроля над своим пространством.' },
  ]

  // 06 · цифры: только то, что есть в админке
  const facts = [
    company.since ? { v: `с ${company.since}`, l: 'строим дома — начинали с одного таунхауса' } : null,
    { v: String(builtEstates), n: builtEstates, l: `${plural(builtEstates, 'посёлок', 'посёлка', 'посёлков')} под Краснодаром` },
    { v: String(projects.length), n: projects.length, l: `${plural(projects.length, 'проект', 'проекта', 'проектов')} домов — только свои` },
    { v: '5 лет', l: 'гарантия на капитальные дефекты' },
  ].filter((f): f is { v: string; l: string; n?: number } => f !== null)

  // 08 · ипотека
  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }
  const mortHouses: MortgageHouse[] = free.map((h) => ({ code: h.code, label: `${h.title}, ${h.estateName}`, price: h.price }))

  // вопросы: шесть из админки клиента + дорога до Краснодара (минуты — из карточек посёлков)
  const faq = [
    ...(company.faq ?? []),
    { q: 'Сколько ехать до Краснодара?', a: 'Из Новой Адыгеи и Козета — 15–25 минут до ТРЦ «Галерея Краснодар» и центра города, из Динской — около 40 минут. В Козете и Новой Адыгее школа и магазин — в 1–5 минутах.' },
  ]
  const tel = telOf(company.phone)

  return (
    <div className="v3 v4">
      <V4Fonts />
      <JsonLd data={organizationLd(company, regions)} />
      {faqLd(faq as typeof company.faq) && <JsonLd data={faqLd(faq as typeof company.faq)!} />}
      <V4Bar phone={company.phone} />

      <MotionRoot>
        <V4Motion />
        {/* ночь → звезда → окна → название → строка клиента → рассвет; H1 — строка с поисковыми словами, она проявляется с рассветом */}
        <div id="top">
          <HeroNight
            slides={heroSlides}
            copy={
              <>
                <div className="v3-wrap v4-hero__top">
                  <a href="#top" className="v4-hero__logo" aria-label="Хороший дом">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/v3/logo-white.svg" alt="" width={118} height={55} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/v3/logo.svg" alt="" width={118} height={55} />
                  </a>
                  <div className="v3-row">
                    {tel && <a className="v4-hero__tel" href={`tel:${tel}`}>{company.phone}</a>}
                    <a className="v3-btn v3-btn--glass v4-hero__btn" href="#doma">Выбрать дом</a>
                  </div>
                </div>
                <div className="v4-hero__title">
                  <p className="v3-hero2__name" aria-label="Хороший дом">
                    {[...NAME].map((ch, k) => <span key={k} aria-hidden style={{ '--i': k } as CSSProperties}>{ch === ' ' ? ' ' : ch}</span>)}
                  </p>
                  <p className="v3-hero2__split"><span>Дом, в который</span><i aria-hidden /><span>хочется возвращаться</span></p>
                  <h1 className="v4-hero__h1">Готовые кирпичные дома с участком под Краснодаром{priceFrom ? <> · <b>от {formatMillions(priceFrom)}</b></> : null}</h1>
                </div>
              </>
            }
          />
        </div>

        <section className="v3-sec v4-sec" id="doma">
          <Head n="01" label="07:00 · Дома в продаже" ghost="Дома"
            lead={`${free.length} ${plural(free.length, 'кирпичный дом', 'кирпичных дома', 'кирпичных домов')} в ${placesOnSale.length > 1 ? 'посёлках ' : ''}${placesOnSale.join(', ')}. Цены и статусы — из прайса застройщика.`}>
            Готовые дома <em>в продаже</em>
          </Head>
          <div className="v3-wrap v3-wrap--wide"><HousePicker houses={pick} catalogHref="/v4/doma" /></div>
        </section>

        {types.length > 0 && (
          <section className="v3-sec v3-sec--linen v4-sec" id="tipy">
            <Head n="02" label="09:00 · Проекты домов" ghost="Проекты"
              lead="Одноэтажные, с мансардой и двухэтажные. У каждого своя планировка и своя страница с домами, которые продаются сейчас.">
              {`${types.length} ${plural(types.length, 'проект', 'проекта', 'проектов')}:`} <em>{`от ${Math.min(...areas).toLocaleString('ru-RU')} до ${Math.max(...areas).toLocaleString('ru-RU')} м²`}</em>
            </Head>
            <div className="v3-wrap"><TypeList types={types} allHref="/v4/proekty" /></div>
          </section>
        )}

        {mapEstates.length > 0 && (
          <section className="v3-sec v3-sec--mist v4-sec" id="poselki">
            <Head n="03" label="11:00 · Посёлки на карте" ghost="Кубань"
              lead="Новая Адыгея и Козет — в 15–25 минутах от Краснодара, Динская — в 40 минутах. Нажмите на посёлок: в карточке — что продаётся и что рядом.">
              Посёлки <em>под Краснодаром</em>
            </Head>
            <div className="v3-wrap" data-move="up"><EstateMap estates={mapEstates} /></div>
          </section>
        )}

        {plots.length > 0 && (
          <section className="v3-sec v3-sec--sky v4-sec" id="genplan">
            <Head n="04" label="13:00 · Генплан в 3D" ghost="Участок"
              lead="Свободные, в брони и проданные — как в отделе продаж. Свет на плане меняется с утра до ночи.">
              Какой участок <em>свободен</em>
            </Head>
            <div className="v3-wrap"><PlotPicker estates={plots} /></div>
          </section>
        )}

        {/* порог: из выбора — в жизнь. Кадр растёт, слова расходятся, поверх — Чехов о том, почему тянет из города */}
        <section className="v4-grow" id="zachem">
          <div className="v4-grow__pin">
            <p className="v4-num v4-grow__num"><b>05</b> / Внутри</p>
            <h2 className="v4-grow__words"><span>Зайдите</span> <span><em>внутрь</em></span></h2>
            <figure className="v4-grow__frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(tip5?.photo, 'wide') ?? '/v3/sunset.webp'} alt="Дом «Тип 5» — в него и заходим" loading="lazy" />
              <i className="v4-grow__scrim" />
            </figure>
            <blockquote className="v4-grow__quote">
              <p>«…кто хоть раз в жизни поймал ерша или видел осенью перелётных дроздов, как они в ясные, прохладные дни носятся стаями над деревней, тот уже не городской житель, и его до самой смерти будет <em>потягивать на волю</em>».</p>
              {/* сверено 13.11 по ПСС, «Наука», 1977, т. 10 (Викитека): фраза в оригинале начинается «А вы знаете, кто…» */}
              <cite>А. П. Чехов · «Крыжовник», 1898</cite>
            </blockquote>
          </div>
        </section>

        <section className="v3-sec v4-sec v4-sec--in" id="vnutri">
          <Head n="05" label="07:30 → 22:00 · Внутри «Типа 5»" ghost="Внутри"
            lead="Это тот дом, что вы видели ночью на первом экране. Пройдите по нему так, как будете жить: с утра до ночи. Площади — по планировке проекта; у домов в продаже варианты от 94 до 110 м².">
            Один день <em>внутри</em>
          </Head>
        </section>
        <Inside stops={stops} plan={plan} />

        <section className="v3-sec v3-sec--linen v4-sec v4-nums" id="kto">
          <Head n="06" label="Почему покупают у нас" ghost="Доверие"
            lead="Мы строим только в своих посёлках и только по своим проектам. Поэтому отвечаем за весь посёлок, а не за одну коробку на чужой земле.">
            Почему <em>у нас</em>
          </Head>
          <div className="v3-wrap v4-nums__rows">
            {facts.map((f) => (
              <div className="v4-nums__row" key={f.l}><b data-count={f.n ?? undefined}>{f.v}</b><span>{f.l}</span></div>
            ))}
          </div>
          <div className="v3-wrap v3-split v4-why">
            <div data-move="up">
              <h3>Дом сдаётся в предчистовой отделке</h3>
              <p>Электричество и отопление разведены, котёл стоит, стены оштукатурены по маякам. Остаётся чистовая отделка — по вашему вкусу.</p>
              <h3>Коммуникации уже на участке</h3>
              <p>Скважина, септик до 9 м³, 15 кВт на дом, газ по меже участка.</p>
            </div>
            <div className="v3-included" data-move="up">
              <h3>Что уже входит в цену</h3>
              <ul>{INCLUDED.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="v3-note">По прайсу застройщика. Отдельные дома продаются в черновой отделке — это указано в карточке дома.</p>
            </div>
          </div>
        </section>

        <section className="v3-sec v4-sec" id="kupit">
          <Head n="07" label="Как купить" ghost="Ключи" lead="Обычная сделка с регистрацией права собственности. Менеджер ведёт её от показа до ключей.">
            Пять шагов <em>до ключей</em>
          </Head>
          <ol className="v3-wrap v4-steps">
            {STEPS.map((s, k) => (
              <li key={s.t} data-move="up"><span>{String(k + 1).padStart(2, '0')}</span><b>{s.t}</b><p>{s.d}</p></li>
            ))}
          </ol>
        </section>

        <section className="v3-sec v3-sec--sky v4-sec" id="ipoteka">
          <Head n="08" label="Ипотека" ghost="Ипотека" lead="Семейная, IT- и сельская ипотека, материнский капитал во взнос. Посчитайте платёж для дома из каталога — точную ставку и одобрение подберём с банком.">
            Ипотека <em>на дом</em>
          </Head>
          <div className="v3-wrap">
            {mortHouses.length > 0 && <Mortgage houses={mortHouses} family={fam} />}
            <ul className="v4-progs">
              {(company.mortgage ?? []).map((m) => <li key={m.title} data-move="up"><b>{m.title}</b><span>{m.text}</span></li>)}
            </ul>
          </div>
        </section>

        <section className="v3-sec v4-sec" id="voprosy">
          <Head n="" label="Частые вопросы" ghost="Вопросы">Коротко <em>о главном</em></Head>
          <div className="v3-wrap v4-faq">
            {faq.map((f, k) => (
              <details key={f.q} open={k === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <V4Final company={company} n="09" context="Главная v4: запись на показ" />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
