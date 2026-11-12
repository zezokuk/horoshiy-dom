import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { LeadForm } from '@/components/LeadForm'
import { HeroNight, type HeroSlide } from '@/components/heroes/HeroNight'
import { PlotPicker, type PlotEstate } from '@/components/home/PlotPicker'
import { getCompany, getEstates, getHouses, getProjects, img, plural } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { mainHref } from '@/lib/site'
import { byEstateStatus, estateSale, estateView, genplanEstate, houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { HousePicker, type PickHouse } from '@/v3/home/HousePicker'
import { StickyCta } from '@/v3/home/StickyCta'
import { DayStory, type DayStep } from '@/v3/home/DayStory'
import { EstateMap, type MapEstate } from '@/v4/EstateMap'
import { TypeList, type TypeView } from '@/v4/TypeList'
import { V4Motion } from '@/v4/V4Motion'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 — сборка по словам Ильи 12.11 (вечер): «начало берём с 2, шрифт, цвета и брендбук — с 3», больше движения
 * как у Aurus, карта с плашками по его рисунку, приёмы из кейса «Чехов» (Артём Павлов, Dprofile):
 * нумерованные разделы «01 / …», заголовок капителью с курсивным словом, огромные слова за разделами,
 * цитата писателя в сторителлинге, название во весь подвал.
 *
 *   ночь → рассвет → типы домов (HeroNight из v2, шрифты v3)   Куда я попал?
 *   01 дома в продаже (подбор и лента, v3)                      Что можно купить и за сколько?
 *   02 дома по типам: строки + фото, ссылки на страницы типов   Какие дома вообще бывают?
 *   03 почему за город: кадр растёт + Чехов + «один день»       Зачем мне это?
 *   04 карта Яндекса с плашками и зелёной карточкой             Где это?
 *   05 генплан в 3D (Игорь)                                     Какой участок мой?
 *   06 как купить                                               Как заплатить?
 *   07 кто строит: цифры выезжают с двух сторон                 Кому верить?
 *   08 запись на показ                                          Что дальше?
 * Сайт многостраничный: шапка и подвал ведут на страницы (каталог, типы, посёлки, ипотека, о компании, контакты).
 * Сами страницы пока в виде v2 — перевод их в v4 идёт следующим шагом.
 */
const NOTO_CSS = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Display:ital,wdth,wght@0,62.5..100,300..600;1,62.5..100,300..600&display=swap'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'v4 — черновик главной', robots: { index: false, follow: false }, alternates: { canonical: '/' } }

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

// сайт многостраничный (Илья 12.11): шапка и подвал ведут на страницы, а не на якоря главной
const NAV = [
  { href: mainHref('/catalog'), label: 'Дома в продаже' },
  { href: mainHref('/projects'), label: 'Типы домов' },
  { href: mainHref('/locations'), label: 'Посёлки' },
  { href: mainHref('/mortgage'), label: 'Ипотека' },
  { href: mainHref('/about'), label: 'О компании' },
  { href: mainHref('/contacts'), label: 'Контакты' },
]
const FOOT = 'Хороший дом'
const NAME = 'ХОРОШИЙ ДОМ'

/** Заголовок раздела по «Чехову»: номер и подпись, за ними огромное слово, заголовок капителью с курсивным словом. */
function Head({ n, label, ghost, children, lead }: { n: string; label: string; ghost: string; children: ReactNode; lead?: ReactNode }) {
  return (
    <>
      <span className="v4-ghost" aria-hidden>{ghost}</span>
      <div className="v3-wrap v4-head">
        <p className="v4-num"><b>{n}</b> / {label}</p>
        <h2 className="v3-h2" data-move="lines">{children}</h2>
        {lead && <p className="v3-lead" data-move="up">{lead}</p>}
      </div>
    </>
  )
}

export default async function V4Home() {
  const [company, estates, houses, projects] = await Promise.all([getCompany(), getEstates(), getHouses(), getProjects()])
  const free = houses.filter((h) => h.status === 'free').map(houseView).sort((a, b) => a.price - b.price)

  // first screen from v2: by day it is a slider of the types on sale (the project's real photo, area, lowest price)
  const heroSlides: HeroSlide[] = projects
    .map((p) => {
      const mine = houses.filter((h) => h.status === 'free' && (typeof h.project === 'object' ? h.project?.id : h.project) === p.id)
      const from = Math.min(...mine.map((h) => h.price ?? 0).filter((x) => x > 0))
      const src = img(p.photo, 'wide')
      if (!mine.length || !src || p.name === 'Тип 5' || p.name === 'Тип 12') return null
      const meta = [p.area ? `${p.area.toLocaleString('ru-RU')} м²` : null, Number.isFinite(from) ? `от ${formatMillions(from)}` : null].filter(Boolean).join(' · ')
      return { title: p.name, meta, src, href: mainHref(`/projects/${p.slug}`) }
    })
    .filter((s): s is HeroSlide => s !== null)
    .slice(0, 5)

  // «дома по типам»: every type with its photo, on sale first (cheapest first), the rest after
  const types: TypeView[] = projects
    .map((p) => {
      const mine = houses.filter((h) => h.status === 'free' && (typeof h.project === 'object' ? h.project?.id : h.project) === p.id)
      const prices = mine.map((h) => h.price ?? 0).filter((x) => x > 0)
      return {
        slug: p.slug, name: p.name, area: p.area ?? null, storeys: p.storeys ?? null, bedrooms: p.bedrooms ?? null,
        photo: img(p.photo, 'wide'), thumb: img(p.photo, 'card'), free: mine.length, from: prices.length ? Math.min(...prices) : null,
        href: mainHref(`/projects/${p.slug}`),
      }
    })
    .filter((t) => t.photo)
    .sort((a, b) => Number(b.free > 0) - Number(a.free > 0) || (a.from ?? Infinity) - (b.from ?? Infinity))
  const areas = types.map((t) => t.area ?? 0).filter((x) => x > 0)

  const pick: PickHouse[] = free.map((h) => ({
    code: h.code, title: h.title, area: h.area, plot: h.plot, price: h.price, estate: h.estateName,
    photo: h.photoCard ?? h.photo, href: h.href, caption: 'Изображение проекта',
  }))

  // the map: every estate with coordinates, on sale first; «рядом» lines from the admin go into the green card
  const nearby = new Map(estates.map((e) => [String(e.slug), (e.nearby ?? []).map((x) => ({ label: x.label, value: x.value }))]))
  const mapEstates: MapEstate[] = byEstateStatus(estates.map((e) => estateView(e, houses)))
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => ({
      slug: c.slug, name: c.name, place: c.place, lat: c.lat!, lng: c.lng!, status: c.status, href: c.href, cover: c.coverCard || c.cover,
      sale: `${estateSale(c)}${c.priceFrom && c.status === 'selling' ? ` · от ${formatMillions(c.priceFrom)}` : ''}`,
      nearby: nearby.get(c.slug) ?? [],
    }))

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
    company.homesBuilt ? { v: String(company.homesBuilt), n: company.homesBuilt, l: plural(company.homesBuilt, 'дом построен', 'дома построено', 'домов построено') } : null,
    { v: '20+', n: 20, l: 'планировок под разный уклад' },
    { v: '5 лет', l: 'гарантия на капитальные дефекты' },
  ].filter((f): f is { v: string; l: string; n?: number } => f !== null)

  const tel = company.phone?.replace(/[^\d+]/g, '')

  return (
    <div className="v3 v4">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={NOTO_CSS} precedence="default" />

      {/* the bar waits until the first screen is passed (html.past-hero is set by HeroNight) */}
      <div className="v4-bar">
        <div className="v3-wrap v4-bar__in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="#top" aria-label="Наверх"><img src="/v3/logo.svg" alt="Хороший дом" width={86} height={40} /></a>
          <nav aria-label="Разделы">{NAV.map((x) => <a key={x.href} href={x.href}>{x.label}</a>)}</nav>
          <div className="v3-row">
            {tel && <a className="v4-bar__tel" href={`tel:${tel}`}>{company.phone}</a>}
            <a className="v3-btn v3-btn--main v4-bar__btn" href="#evf-form">Записаться на показ</a>
          </div>
        </div>
      </div>

      <MotionRoot>
        <V4Motion />
        {/* сцена — из v2 (ночь → рассвет → типы домов), текст и шрифт — из v3: название узкой капителью,
            буквы поднимаются по очереди, фраза клиента разнесена влево и вправо */}
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
                  <h1 aria-label="Хороший дом — дом, в который хочется возвращаться">
                    <span className="v3-hero2__name" aria-hidden>
                      {[...NAME].map((ch, k) => <span key={k} style={{ animationDelay: `${0.25 + k * 0.045}s` }}>{ch === ' ' ? '\u00a0' : ch}</span>)}
                    </span>
                    <span className="v3-hero2__split" aria-hidden><span>Дом, в который</span><i /><span>хочется возвращаться</span></span>
                  </h1>
                </div>
              </>
            }
          />
        </div>

        <section className="v3-sec v4-sec" id="doma">
          <Head n="01" label="Дома в продаже" ghost="Дома">Подберите дом <em>под свою жизнь</em></Head>
          <div className="v3-wrap v3-wrap--wide"><HousePicker houses={pick} catalogHref={mainHref('/catalog')} /></div>
        </section>

        {types.length > 0 && (
          <section className="v3-sec v3-sec--linen v4-sec" id="tipy">
            <Head n="02" label="Типы домов" ghost="Типы" lead={areas.length ? `${types.length} ${plural(types.length, 'тип', 'типа', 'типов')} кирпичных домов от ${Math.min(...areas).toLocaleString('ru-RU')} до ${Math.max(...areas).toLocaleString('ru-RU')} м². У каждого своя планировка и своя страница.` : undefined}>
              Дом <em>по типу</em>
            </Head>
            <div className="v3-wrap"><TypeList types={types} allHref={mainHref('/projects')} /></div>
          </section>
        )}

        {/* Aurus: «картинка в картинке» — маленький кадр растёт на весь экран; поверх выходит строка Чехова */}
        <section className="v4-grow" id="zachem">
          <div className="v4-grow__pin">
            <p className="v4-num v4-grow__num"><b>03</b> / Почему за город</p>
            <h2 className="v4-grow__words" aria-label="Почему за город"><span aria-hidden>Почему</span><span aria-hidden><em>за город</em></span></h2>
            <figure className="v4-grow__frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/v3/sunset.webp" alt="Построенный дом на закате" loading="lazy" />
              <i className="v4-grow__scrim" />
            </figure>
            <blockquote className="v4-grow__quote">
              <p>«Кто хоть раз в жизни поймал ерша или видел осенью перелётных дроздов, как они в ясные, прохладные дни носятся стаями над деревней, тот уже не городской житель, и его до самой смерти будет <em>потягивать на волю</em>».</p>
              <cite>А. П. Чехов · «Крыжовник», 1898</cite>
            </blockquote>
          </div>
        </section>

        <section className="v3-sec v4-sec" id="den">
          <Head n="03" label="Один день в своём доме" ghost="Утро" lead="Вот ради чего меняют квартиру на дом. Не ради метров — ради того, как проходит обычный день.">
            Размеренный ритм. <em>Чувство.</em> Воздух.
          </Head>
          <div className="v3-wrap">
            <DayStory steps={DAY} coda="Это дом, в который возвращаешься не потому, что нужно, а потому, что хочется." />
          </div>
        </section>

        {mapEstates.length > 0 && (
          <section className="v3-sec v3-sec--mist v4-sec" id="poselki">
            <Head n="04" label="Посёлки на карте" ghost="Кубань" lead="Нажмите на плашку — карта подъедет к посёлку, а в карточке будет главное: что продаётся и что рядом.">
              Где вы <em>проснётесь</em>
            </Head>
            <div className="v3-wrap" data-move="up"><EstateMap estates={mapEstates} /></div>
          </section>
        )}

        {plots.length > 0 && (
          <section className="v3-sec v3-sec--sky v4-sec" id="genplan">
            <Head n="05" label="Генплан в 3D" ghost="Участок" lead="Свободные, в брони и проданные — как в отделе продаж. Утро, день, вечер и ночь переключаются прямо на плане.">
              Выберите <em>свой</em> участок
            </Head>
            <div className="v3-wrap"><PlotPicker estates={plots} /></div>
          </section>
        )}

        <section className="v3-sec v4-sec" id="kupit">
          <span className="v4-ghost" aria-hidden>Ключи</span>
          <div className="v3-wrap v3-split v4-head">
            <div>
              <p className="v4-num"><b>06</b> / Как купить</p>
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

        <section className="v3-sec v3-sec--linen v4-sec v4-nums" id="kto">
          <Head n="07" label="Кто строит" ghost="Команда" lead="В команде — архитекторы и инженеры. Каждый наш дом выглядит по-своему: разные сочетания фактур и цвета, качественные материалы.">
            Мы создаём не дома, <em>а образ жизни</em>
          </Head>
          <div className="v3-wrap v4-nums__rows">
            {facts.map((f) => (
              <div className="v4-nums__row" key={f.l}><b data-count={f.n ?? undefined}>{f.v}</b><span>{f.l}</span></div>
            ))}
          </div>
        </section>

        <section className="v3-sec v3-final v4-sec" id="pokaz">
          <span className="v4-ghost" aria-hidden>Показ</span>
          <div className="v3-wrap v3-split v4-head">
            <div>
              <p className="v4-num"><b>08</b> / Запись на показ</p>
              <h2 className="v3-h2" data-move="lines">Приезжайте <em>посмотреть</em></h2>
              <p className="v3-lead">Покажем дом и посёлок вживую, ответим про участок, документы и ипотеку.</p>
              <ul className="v3-offices">{(company.offices ?? []).map((o) => <li key={o.title}><b>{o.title}</b><span>{[o.address, o.hours].filter(Boolean).join(' · ')}</span></li>)}</ul>
              {company.phone && <p className="v3-final__tel">{company.phone}</p>}
            </div>
            <div className="v3-final__form" id="evf-form">
              <LeadForm light cta="Записаться на показ" target={{ interest: 'buy', context: 'Главная v4: запись на показ' }} />
            </div>
          </div>
        </section>

        <footer className="v4-foot">
          <div className="v3-wrap v4-foot__top">
            <p>Строим и продаём кирпичные дома под Краснодаром{company.since ? ` с ${company.since} года` : ''}.</p>
            <nav aria-label="Разделы в подвале">{NAV.map((x) => <a key={x.href} href={x.href}>{x.label}</a>)}</nav>
          </div>
          <p className="v4-foot__word" aria-hidden>{[...FOOT].map((ch, k) => <span key={k}>{ch === ' ' ? ' ' : ch}</span>)}</p>
        </footer>
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
