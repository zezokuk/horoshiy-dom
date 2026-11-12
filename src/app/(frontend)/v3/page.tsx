import type { Metadata } from 'next'
import { LeadForm } from '@/components/LeadForm'
import { PlotPicker, type PlotEstate } from '@/components/home/PlotPicker'
import { getCompany, getEstates, getHouses, plural } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { mainHref } from '@/lib/site'
import { byEstateStatus, estateSale, estateView, genplanEstate, houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { HeroScene } from '@/v3/home/HeroScene'
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

export default async function V3Home() {
  const [company, estates, houses] = await Promise.all([getCompany(), getEstates(), getHouses()])
  const free = houses.filter((h) => h.status === 'free').map(houseView).sort((a, b) => a.price - b.price)
  const priceFrom = free.find((h) => h.price > 0)?.price
  const priceLine = priceFrom ? `от ${formatMillions(priceFrom)}` : ''

  // first screen (Aurus-style numbers over the photo): live from the admin, so they never go stale
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

  return (
    <div className="v3">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={NOTO_CSS} precedence="default" />
      <MotionRoot>
        <HeroScene photo="/v3/sky.webp" photoPhone="/v3/sky-phone.webp" priceLine={priceLine} phone={company.phone} />

        <section className="v3-sec" id="doma">
          <div className="v3-wrap">
            <p className="v3-eyebrow">Дома в продаже</p>
            <h2 className="v3-h2" data-move="lines">Подберите дом <em>под свою жизнь</em></h2>
          </div>
          <div className="v3-wrap v3-wrap--wide"><HousePicker houses={pick} catalogHref={mainHref('/catalog')} /></div>
        </section>


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


        <section className="v3-sec" id="poselki">
          <div className="v3-wrap">
            <p className="v3-eyebrow">Посёлки</p>
            <h2 className="v3-h2" data-move="lines">Где вы <em>проснётесь</em></h2>
          </div>
          <div className="v3-wrap v3-covers">
            {covers.map((c) => (
              <a key={c.slug} href={c.href} className={`v3-cover v3-cover--${c.status}`} data-move="up">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.coverCard || c.cover ? <img src={c.coverCard || c.cover} alt={c.name} loading="lazy" data-move="reveal" /> : (
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


        <section className="v3-sec v3-final" id="pokaz">
          <div className="v3-wrap v3-split">
            <div>
              <p className="v3-eyebrow">Запись на показ</p>
              <h2 className="v3-h2" data-move="lines">Приезжайте <em>посмотреть</em></h2>
              <p className="v3-lead">Покажем дом и посёлок вживую, ответим про участок, документы и ипотеку.</p>
              <ul className="v3-offices">{(company.offices ?? []).map((o) => <li key={o.title}><b>{o.title}</b><span>{[o.address, o.hours].filter(Boolean).join(' · ')}</span></li>)}</ul>
              {company.phone && <p className="v3-final__tel">{company.phone}</p>}
            </div>
            <div className="v3-final__form" id="evf-form">
              <LeadForm light cta="Записаться на показ" target={{ interest: 'buy', context: 'Главная v3: запись на показ' }} />
            </div>
          </div>
        </section>
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
