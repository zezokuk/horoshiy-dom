import type { Metadata } from 'next'
import { EveningFinale } from '@/components/home/EveningFinale'
import { PlotPicker, type PlotEstate } from '@/components/home/PlotPicker'
import { getCompany, getEstates, getHouses, getProjects, img, plural } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { mainHref } from '@/lib/site'
import { byEstateStatus, estateSale, estateView, genplanEstate, houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { HeroDawn, type DawnSlide } from '@/v3/home/HeroDawn'
import { HousePicker, type PickHouse } from '@/v3/home/HousePicker'
import { StickyCta } from '@/v3/home/StickyCta'
import { DayStory, type DayStep } from '@/v3/home/DayStory'
import '@/v3/v3.css'

/**
 * v3 — черновик новой главной (12.11.2026). Концепция «Утро в своём доме» — `11-Хороший-дом-с-нуля/05`, брендбук — `06`
 * (шрифты «Усадьба»: Noto Serif Display узкий + Unbounded + Manrope). Бэкенд, админка, форма заявки и 3D — прежние.
 * Порядок: рассвет → подбор и дома → почему за город → посёлки → 3D → как купить → кто строит → вечер и заявка.
 */
// Noto Serif Display with its width axis: next/font (Turbopack, 12.11) fails on this font — «Can't resolve
// @vercel/turbopack-next/internal/font/google/font». The draft links the Google Fonts stylesheet; self-host before launch.
const NOTO_CSS = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Display:ital,wdth,wght@0,62.5..100,300..600;1,62.5..100,300..600&display=swap'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'v3 — черновик главной', robots: { index: false, follow: false }, alternates: { canonical: '/' } }

const BUY = [
  { t: 'Семейная ипотека', d: 'для семей с детьми' },
  { t: 'IT-ипотека', d: 'для сотрудников аккредитованных IT-компаний' },
  { t: 'Сельская ипотека', d: 'для домов в сельской местности' },
  { t: 'Материнский капитал', d: 'в первоначальный взнос' },
]
// предчистовая отделка — дословно по прайсу клиента 27.10.2026
const INCLUDED = ['Разводка электричества и отопления', 'Электрический котёл', 'Штукатурка по маякам', 'Ворота: откатные или распашные', 'Отмостка и паркоместо из плитки', 'Скважина', '15 кВт на дом', 'Газ по меже', 'Септик до 9 м³']

// «Один день»: тексты — по «Мыслям о загородной жизни» и «Для кого мы строим» клиента (27.10.2026)
const DAY: DayStep[] = [
  { time: '06:40', word: 'Ритм', text: 'Тихий завтрак на воздухе. Кофе на террасе, роса на газоне, и никуда не нужно спешить.', src: '/design/morning-breakfast.webp', cap: 'Иллюстрация' },
  { time: '15:00', word: 'Чувство', text: 'Дети играют на газоне с поливалкой, собака носится рядом, кот спит на кресле. Своя земля — своё пространство.', src: '/v3/terrace.webp', cap: 'Фото построенного дома' },
  { time: '20:30', word: 'Воздух', text: 'Мангал, гитара, тёплый свет в окнах и вечер без соседей за стенкой. Тишина здесь — это чувство контроля над своим пространством.', src: '/v3/sunset.webp', cap: 'Фото построенного дома' },
]

function Bridge({ text, href }: { text: string; href: string }) {
  return (
    <a className="v3-bridge" href={href} data-move="up">
      <span>{text}</span><i aria-hidden>↓</i>
    </a>
  )
}

export default async function V3Home() {
  const [company, estates, houses, projects] = await Promise.all([getCompany(), getEstates(), getHouses(), getProjects()])
  const free = houses.filter((h) => h.status === 'free').map(houseView).sort((a, b) => a.price - b.price)
  const priceFrom = free.find((h) => h.price > 0)?.price
  const priceLine = priceFrom ? `от ${formatMillions(priceFrom)}` : ''

  // first screen: the built house in the morning, then the types on sale with their own picture, area and lowest price
  const slides: DawnSlide[] = [{ src: '/v3/hero.webp', phone: '/v3/hero-phone.webp', title: 'Наш дом', meta: 'построен', href: '#doma', caption: 'Фото построенного дома' }]
  for (const p of projects) {
    const mine = free.filter((h) => h.title.startsWith(p.name))
    const src = img(p.photo, 'wide')
    if (!mine.length || !src || p.name === 'Тип 12') continue // «Тип 12» — только рендер с бассейном, на первый экран не ставим
    slides.push({ src, title: p.name, meta: `${p.area ? `${p.area.toLocaleString('ru-RU')} м² · ` : ''}от ${formatMillions(mine[0].price)}`, href: mainHref(`/projects/${p.slug}`), caption: 'Изображение проекта' })
  }

  const pick: PickHouse[] = free.map((h) => ({
    code: h.code, title: h.title, area: h.area, plot: h.plot, price: h.price, estate: h.estateName,
    photo: h.photoCard ?? h.photo, href: h.href, caption: 'Изображение проекта',
  }))

  const covers = byEstateStatus(estates.map((e) => estateView(e, houses)))

  const plots: PlotEstate[] = estates
    .map((e) => {
      const mine = houses.filter((h) => (typeof h.estate === 'object' ? h.estate?.id : h.estate) === e.id).map(houseView)
      return { e, mine, free: mine.filter((h) => h.status === 'free').length }
    })
    .filter((x) => x.free > 0 && x.e.status !== 'planned')
    .sort((a, b) => b.free - a.free)
    .map(({ e, mine }) => ({ name: e.name, href: estateView(e, houses).href, estate: genplanEstate(e, mine.length), houses: mine }))

  const years = company.since ? new Date().getFullYear() - company.since : null
  const facts = [
    years ? { v: `с ${company.since}`, l: `строим дома, ${years} ${plural(years, 'год', 'года', 'лет')}` } : null,
    company.homesBuilt ? { v: String(company.homesBuilt), l: plural(company.homesBuilt, 'дом построен', 'дома построено', 'домов построено') } : null,
    { v: '20+', n: 20, l: 'планировок под разный уклад' },
    { v: '5 лет', l: 'гарантия на капитальные дефекты' },
  ].filter((f): f is { v: string; l: string; n?: number } => f !== null)

  const menu = [
    { label: 'Дома', href: '#doma' },
    { label: 'Посёлки', href: '#poselki' },
    { label: 'Как купить', href: '#kupit' },
    { label: 'О компании', href: mainHref('/about') },
    { label: 'Контакты', href: mainHref('/contacts') },
  ]

  return (
    <div className="v3">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={NOTO_CSS} precedence="default" />
      <MotionRoot>
        <HeroDawn slides={slides} priceLine={priceLine} phone={company.phone} menu={menu} />

        <section className="v3-sec" id="doma">
          <div className="v3-wrap">
            <p className="v3-eyebrow">Дома в продаже</p>
            <h2 className="v3-h2" data-move="lines">Подберите дом <em>под свою жизнь</em></h2>
          </div>
          <div className="v3-wrap v3-wrap--wide"><HousePicker houses={pick} catalogHref={mainHref('/catalog')} /></div>
        </section>

        <Bridge text="А теперь — зачем вообще свой дом" href="#zachem" />

        <section className="v3-sec" id="zachem">
          <div className="v3-wrap">
            <p className="v3-eyebrow">Один день в своём доме</p>
            <h2 className="v3-h2" data-move="lines">Размеренный ритм. <em>Чувство.</em> Воздух.</h2>
            <p className="v3-lead" data-move="up">Вот ради чего меняют квартиру на дом. Не ради метров — ради того, как проходит обычный день.</p>
          </div>
          <div className="v3-wrap">
            <DayStory steps={DAY} coda="Это дом, в который возвращаешься не потому, что нужно, а потому, что хочется." />
          </div>
        </section>

        <Bridge text="Осталось выбрать, где проснуться" href="#poselki" />

        <section className="v3-sec" id="poselki">
          <div className="v3-wrap">
            <p className="v3-eyebrow">Посёлки</p>
            <h2 className="v3-h2" data-move="lines">Где вы <em>проснётесь</em></h2>
          </div>
          <div className="v3-wrap v3-covers">
            {covers.map((c) => (
              <a key={c.slug} href={c.href} className={`v3-cover v3-cover--${c.status}`} data-move="up">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.coverCard || c.cover ? <img src={c.coverCard || c.cover} alt={c.name} loading="lazy" /> : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <span className="v3-cover__blank"><img src="/v3/logo-white.svg" alt="" width={140} height={65} /><b>{c.name}</b></span>
                )}
                <div className="v3-cover__body">
                  {/* the name is on the cover itself (client's lettering or our blank card): the title stays for screen readers */}
                  <h3 className="v3-sr">{c.name}</h3>
                  <p>{estateSale(c)}{c.priceFrom && c.status === 'selling' ? ` · от ${formatMillions(c.priceFrom)}` : ''}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <Bridge text="Посмотрите, где именно стоит дом" href="#genplan" />

        {plots.length > 0 && (
          <section className="v3-sec v3-sec--sky" id="genplan">
            <div className="v3-wrap">
              <p className="v3-eyebrow">Генплан в 3D</p>
              <h2 className="v3-h2" data-move="lines">Выберите <em>свой</em> участок</h2>
              <p className="v3-lead">Свободные, в брони и проданные — как в отделе продаж. Утро, день, вечер и ночь переключаются прямо на плане.</p>
              <PlotPicker estates={plots} />
            </div>
          </section>
        )}

        <Bridge text="Теперь посчитаем, сколько платить" href="#kupit" />

        <section className="v3-sec" id="kupit">
          <div className="v3-wrap v3-split">
            <div>
              <p className="v3-eyebrow">Как купить</p>
              <h2 className="v3-h2" data-move="lines">Дом по ипотеке <em>или</em> сразу</h2>
              <div className="v3-buy">
                {BUY.map((b) => <div key={b.t} data-move="up"><b>{b.t}</b><span>{b.d}</span></div>)}
              </div>
              <p className="v3-note">Бронь дома — 100 000 ₽. Рассрочка — индивидуально. Платёж по ипотеке посчитаем, когда придут ставки банков.</p>
            </div>
            <div className="v3-included" data-move="up">
              <h3>Что уже входит в цену</h3>
              <ul>{INCLUDED.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="v3-note">Предчистовая отделка — по прайсу застройщика.</p>
            </div>
          </div>
        </section>

        <Bridge text="И о тех, кто строит" href="#kto" />

        <section className="v3-sec v3-sec--linen" id="kto">
          <div className="v3-wrap">
            <p className="v3-eyebrow">Кто строит</p>
            <h2 className="v3-h2" data-move="lines">Мы создаём не дома, <em>а образ жизни</em></h2>
            <div className="v3-facts">
              {facts.map((f) => <div key={f.l} data-move="up"><b data-count={f.n ?? undefined}>{f.v}</b><span>{f.l}</span></div>)}
            </div>
            <p className="v3-lead">В команде — архитекторы и инженеры. Каждый наш дом выглядит по-своему: разные сочетания фактур и цвета, качественные материалы.</p>
          </div>
        </section>

        <Bridge text="Приезжайте посмотреть вживую" href="#evf-form" />

        <div id="pokaz">
          <EveningFinale offices={(company.offices ?? []).map((o) => ({ title: o.title, address: o.address, hours: o.hours }))} phone={company.phone} target={{ context: 'Главная v3: вечерний финал' }} />
        </div>
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
