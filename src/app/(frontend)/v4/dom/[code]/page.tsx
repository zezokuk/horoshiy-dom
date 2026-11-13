import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PlanRender } from '@/components/PlanRender'
import { getCompany, getHouse, getHouses, img, plural } from '@/lib/data'
import { STATUS_LABEL, formatArea, formatMillions } from '@/lib/format'
import { JsonLd, breadcrumbsLd, houseLd } from '@/lib/seo'
import { mainHref } from '@/lib/site'
import { houseView, roomsView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { Mortgage } from '@/v4/Mortgage'
import { V4Bar, V4Final, V4Fonts, V4Footer, telOf } from '@/v4/Shell'
import type { Estate, Project, Region } from '@/payload-types'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 · страница дома (черновик, 13.11): тот же каркас, что у главной v4 (шапка, финал с формой, подвал).
 * Первый экран: фото и панель покупки рядом — цена, статус, «Записаться на показ». Ниже: цифры дома,
 * планировка (вид сверху с площадями комнат, если есть, иначе чертёж), что входит в цену, платёж по ипотеке,
 * похожие дома. Данные — те же, что у страницы дома v2 (`/r/[region]/houses/[code]`); она остаётся рабочей.
 */
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ code: string }> }

const INCLUDED = ['Разводка электричества и отопления', 'Электрический котёл', 'Штукатурка стен по маякам', 'Ворота: откатные или распашные', 'Отмостка и паркоместо из плитки', 'Скважина', '15 кВт на дом', 'Газ по меже участка', 'Септик до 9 м³']

async function load(params: Props['params']) {
  const { code } = await params
  const house = await getHouse(code)
  if (!house) return null
  const estate = house.estate as Estate | undefined
  return estate ? { house, estate, region: estate.region as Region | undefined } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params)
  if (!d) return {}
  const h = houseView(d.house)
  return {
    title: { absolute: `${h.title}, ${formatArea(h.area)} м², посёлок «${d.estate.name}» — ${formatMillions(h.price)} · Хороший дом` },
    description: `Кирпичный дом ${formatArea(h.area)} м²${h.plot ? `, участок ${h.plot}` : ''}, ${d.estate.place}. ${STATUS_LABEL[h.status]}. Предчистовая отделка, ипотека, показ вживую.`,
    robots: { index: false, follow: false }, // черновик v4: канонический адрес — страница дома v2
    alternates: { canonical: h.href },
  }
}

export default async function V4House({ params }: Props) {
  const d = await load(params)
  if (!d) notFound()
  const { house, estate: e, region } = d
  const h = houseView(house)
  const project = typeof house.project === 'object' ? (house.project as Project | null) : null
  const [company, all] = await Promise.all([getCompany(), getHouses({ status: 'free' })])

  // вид сверху с мебелью — только если у дома планировка самого проекта (варианты В2, В3 — со своей)
  const mediaId = (m: unknown) => (m && typeof m === 'object' ? (m as { id?: unknown }).id : m)
  const samePlan = !house.plan || mediaId(house.plan) === mediaId(project?.plan)
  const render = samePlan ? img(project?.render, 'wide') : undefined
  const rooms = render ? roomsView(project) : []
  const photo = h.photo ?? img(project?.photo, 'wide')
  const rough = h.features.includes('Черновая отделка')
  const similar = all.filter((x) => x.code !== h.code).map(houseView).sort((a, b) => Math.abs(a.price - h.price) - Math.abs(b.price - h.price)).slice(0, 3)
  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }
  const tel = telOf(company.phone)

  const facts = [
    { v: `${formatArea(h.area)} м²`, l: h.mansard ? `дом + мансарда ${formatArea(h.mansard)} м²` : 'площадь дома' },
    h.plot ? { v: h.plot.replace(/\s*сот\.?$/, ' сот.'), l: 'участок' } : null,
    h.bedrooms ? { v: String(h.bedrooms), l: plural(h.bedrooms, 'спальня', 'спальни', 'спален') } : null,
    h.bathrooms ? { v: String(h.bathrooms), l: plural(h.bathrooms, 'санузел', 'санузла', 'санузлов') } : null,
    { v: h.storeys === 2 ? '2' : '1', l: h.storeys === 2 ? 'этажа' : h.mansard ? 'этаж и мансарда' : 'этаж' },
  ].filter((f): f is { v: string; l: string } => f !== null)

  return (
    <div className="v3 v4 v4-house">
      <V4Fonts />
      <JsonLd data={houseLd(h, e, region ?? ({} as Region), company.legalName || company.name)} />
      <JsonLd data={breadcrumbsLd([{ name: 'Главная', url: mainHref('/') }, { name: e.name, url: h.href.replace(/\/houses\/.*/, `/objects/${e.slug}`) }, { name: h.title, url: h.href }])} />
      <V4Bar phone={company.phone} always />
      <MotionRoot>
        <header className="v4-dom">
          <figure className="v4-dom__photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo ? <img src={photo} alt={`${h.title}, посёлок «${e.name}»`} fetchPriority="high" /> : <span className="v3-card__noimg">Фото скоро</span>}
            {/* какой дом на каком фото, клиент ещё не подтвердил — подпись честная для всех (16-Аудит-картинок, п. 5) */}
            <figcaption>Изображение проекта</figcaption>
          </figure>
          <div className="v4-dom__panel">
            <nav className="v4-dom__crumbs" aria-label="Навигация"><a href="/v4">Главная</a><span aria-hidden>/</span><a href={`/v4/poselok/${e.slug}`}>{e.name}</a></nav>
            <p className={`v3-status v4-dom__status v4-dom__status--${h.status}`}><i />{STATUS_LABEL[h.status]}</p>
            <h1>{h.title}</h1>
            <p className="v4-dom__where">Посёлок <a href={`/v4/poselok/${e.slug}`}>«{e.name}»</a> · {e.place}{project ? <> · проект <a href={`/v4/proekt/${project.slug}`}>{project.name}</a></> : null}</p>
            <p className="v4-price v4-dom__price">{formatMillions(h.price)}</p>
            <p className="v3-note">{rough ? 'В черновой отделке.' : 'В предчистовой отделке, коммуникации на участке.'} Бронь — 100 000 ₽.</p>
            <div className="v3-row v4-dom__cta">
              <a className="v3-btn v3-btn--main" href="#evf-form">Записаться на показ</a>
              {tel && <a className="v3-btn v4-btn--line" href={`tel:${tel}`}>{company.phone}</a>}
            </div>
          </div>
        </header>

        <section className="v3-sec v4-sec v4-dom__facts">
          <div className="v3-wrap v4-nums__rows">
            {facts.map((f) => <div className="v4-nums__row" key={f.l}><b>{f.v}</b><span>{f.l}</span></div>)}
          </div>
        </section>

        {(render || h.plan) && (
          <section className="v3-sec v3-sec--linen v4-sec" id="plan">
            <div className="v3-wrap v4-head">
              <p className="v4-num">Планировка</p>
              <h2 className="v3-h2" data-move="lines">Как устроен <em>дом</em></h2>
              {render && <p className="v3-lead">Наведите на комнату — подсветим её площадь. Мебель на виде сверху — для примера.</p>}
            </div>
            <div className="v3-wrap">
              {render ? <PlanRender render={render} plan={h.plan} rooms={rooms} alt={`Планировка «${h.title}»`} /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="v4-dom__plan" src={h.plan!} alt={`Планировка «${h.title}»`} loading="lazy" />
              )}
            </div>
          </section>
        )}

        <section className="v3-sec v4-sec">
          <div className="v3-wrap v3-split">
            <div>
              <p className="v4-num">Что входит в цену</p>
              <h2 className="v3-h2" data-move="lines">Дом готов <em>к отделке</em></h2>
              <p className="v3-lead">{rough ? 'Этот дом продаётся в черновой отделке: стены и коммуникации — по договору.' : 'Электричество и отопление разведены, котёл стоит, стены оштукатурены. Остаётся чистовая отделка — по вашему вкусу.'}</p>
            </div>
            <div className="v3-included">
              <h3>По прайсу застройщика</h3>
              <ul>{INCLUDED.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="v3-sec v3-sec--sky v4-sec" id="ipoteka">
          <div className="v3-wrap v4-head">
            <p className="v4-num">Ипотека</p>
            <h2 className="v3-h2" data-move="lines">Платёж <em>в месяц</em></h2>
          </div>
          <div className="v3-wrap"><Mortgage houses={[{ code: h.code, label: h.title, price: h.price }]} family={fam} /></div>
        </section>

        {similar.length > 0 && (
          <section className="v3-sec v4-sec">
            <div className="v3-wrap v4-head">
              <p className="v4-num">Похожие по цене</p>
              <h2 className="v3-h2" data-move="lines">Ещё <em>посмотреть</em></h2>
            </div>
            <div className="v3-wrap v4-dom__similar">
              {similar.map((s) => (
                <a key={s.code} className="v3-card" href={`/v4/dom/${s.code}`}>
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.photoCard || s.photo ? <img src={s.photoCard ?? s.photo} alt={s.title} loading="lazy" /> : <span className="v3-card__noimg">Фото скоро</span>}
                  </figure>
                  <div className="v3-card__body">
                    <h3>{s.title} · {formatArea(s.area)} м²</h3>
                    <p>{s.estateName}{s.plot ? ` · ${s.plot}` : ''}</p>
                    <p className="v3-price">{formatMillions(s.price)}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <V4Final company={company} context={`Дом v4: ${h.title}, ${e.name}`} lead={`Покажем «${h.title}» и посёлок «${e.name}» вживую или по видеосвязи. Ответим про участок, документы и ипотеку.`} />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
