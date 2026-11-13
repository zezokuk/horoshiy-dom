import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PlotPicker } from '@/components/home/PlotPicker'
import { getCompany, getEstate, getHouses, plural } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { JsonLd, breadcrumbsLd, estateLd } from '@/lib/seo'
import { mainHref } from '@/lib/site'
import { estateSale, estateView, genplanEstate, houseView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { HousePicker, type PickHouse } from '@/v3/home/HousePicker'
import { StickyCta } from '@/v3/home/StickyCta'
import { V4Bar, V4Final, V4Fonts, V4Footer } from '@/v4/Shell'
import type { Region } from '@/payload-types'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 · страница посёлка (черновик, 13.11). Отвечает на «где это и как там жить»: обложка клиента и панель с главным,
 * что рядом с минутами, коммуникации, дома в продаже (карточки ведут на /v4/dom), генплан в 3D, запись на показ.
 * Данные — из админки посёлка; канонический адрес — страница посёлка v2, пока v4 черновик.
 */
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const e = await getEstate(slug)
  if (!e) return {}
  const houses = await getHouses({ estate: e.id })
  const v = estateView(e, houses)
  return {
    title: { absolute: `Дома в посёлке «${e.name}», ${e.place ?? ''}${v.priceFrom ? ` — от ${formatMillions(v.priceFrom)}` : ''} · Хороший дом` },
    description: `${e.kind || 'Посёлок'} «${e.name}»: ${estateSale(v).toLowerCase()}. ${e.tagline ?? ''}`.trim(),
    robots: { index: false, follow: false },
    alternates: { canonical: v.href },
  }
}

export default async function V4Estate({ params }: Props) {
  const { slug } = await params
  const e = await getEstate(slug)
  if (!e) notFound()
  const [company, houses] = await Promise.all([getCompany(), getHouses({ estate: e.id })])
  const region = (typeof e.region === 'object' ? e.region : undefined) as Region | undefined
  const v = estateView(e, houses)
  const all = houses.map(houseView)
  const free = all.filter((h) => h.status === 'free').sort((a, b) => a.price - b.price)
  const pick: PickHouse[] = free.map((h) => ({
    code: h.code, title: h.title, area: h.area, plot: h.plot, price: h.price, estate: h.estateName,
    photo: h.photoCard ?? h.photo, href: `/v4/dom/${h.code}`, caption: 'Изображение проекта',
  }))
  const plot = free.length && e.status !== 'planned' ? [{ name: e.name, href: v.href, estate: genplanEstate(e, all.length), houses: all }] : []
  const map = e.lat && e.lng ? `https://yandex.ru/maps/?pt=${e.lng},${e.lat}&z=15&l=map` : null

  const facts = [
    e.homes ? { v: String(e.homes), l: plural(e.homes, 'дом в посёлке', 'дома в посёлке', 'домов в посёлке') } : null,
    { v: String(free.length), l: `${plural(free.length, 'дом', 'дома', 'домов')} в продаже` },
    v.priceFrom ? { v: formatMillions(v.priceFrom).replace(' млн ₽', ''), l: 'млн ₽ — цена от' } : null,
    (e.nearby ?? [])[0] ? { v: e.nearby![0].value, l: `до ${e.nearby![0].label}` } : null,
  ].filter((f): f is { v: string; l: string } => f !== null)

  return (
    <div className="v3 v4 v4-house">
      <V4Fonts />
      {region && <JsonLd data={estateLd(e, region, free)} />}
      <JsonLd data={breadcrumbsLd([{ name: 'Главная', url: mainHref('/') }, { name: e.name, url: v.href }])} />
      <V4Bar phone={company.phone} always />
      <MotionRoot>
        <header className="v4-dom v4-place">
          <figure className="v4-dom__photo v4-place__cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {v.cover ? <img src={v.cover} alt={`Обложка посёлка «${e.name}»`} fetchPriority="high" /> : <span className="v3-card__noimg">Обложка скоро</span>}
          </figure>
          <div className="v4-dom__panel">
            <nav className="v4-dom__crumbs" aria-label="Навигация"><a href="/v4">Главная</a><span aria-hidden>/</span><a href="/v4#poselki">Посёлки</a></nav>
            <p className={`v3-status v4-dom__status v4-place__status--${v.status}`}><i />{estateSale(v)}</p>
            <h1>{e.name}</h1>
            <p className="v4-dom__where">{[e.kind, e.place].filter(Boolean).join(' · ')}</p>
            {e.tagline && <p className="v3-lead v4-place__tag">{e.tagline}</p>}
            {e.description && <p className="v4-place__text">{e.description}</p>}
            <div className="v3-row v4-dom__cta">
              {free.length > 0 && <a className="v3-btn v3-btn--main" href="#doma">Дома в продаже</a>}
              <a className="v3-btn v4-btn--line" href="#evf-form">Записаться на показ</a>
            </div>
          </div>
        </header>

        <section className="v3-sec v4-sec v4-dom__facts">
          <div className="v3-wrap v4-nums__rows">
            {facts.map((f) => <div className="v4-nums__row" key={f.l}><b>{f.v}</b><span>{f.l}</span></div>)}
          </div>
        </section>

        {((e.nearby ?? []).length > 0 || (e.utilities ?? []).length > 0) && (
          <section className="v3-sec v3-sec--mist v4-sec">
            <div className="v3-wrap v3-split">
              {(e.nearby ?? []).length > 0 && (
                <div>
                  <p className="v4-num">Что рядом</p>
                  <h2 className="v3-h2" data-move="lines">Всё нужное <em>в минутах</em></h2>
                  <ul className="v4-near">{e.nearby!.map((n) => <li key={n.label}><span>{n.label}</span><b>{n.value}</b></li>)}</ul>
                  {map && <p className="v3-note"><a href={map} target="_blank" rel="noreferrer">Открыть посёлок на Яндекс Картах →</a></p>}
                </div>
              )}
              {((e.utilities ?? []).length > 0 || (e.infrastructure ?? []).length > 0) && (
                <div className="v3-included">
                  <h3>Коммуникации и инфраструктура</h3>
                  <ul>{[...(e.utilities ?? []), ...(e.infrastructure ?? [])].map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              )}
            </div>
          </section>
        )}

        {free.length > 0 && (
          <section className="v3-sec v4-sec" id="doma">
            <div className="v3-wrap v4-head">
              <p className="v4-num">Дома в продаже</p>
              <h2 className="v3-h2" data-move="lines">{`${free.length} ${plural(free.length, 'дом', 'дома', 'домов')}`} <em>в «{e.name}»</em></h2>
            </div>
            <div className="v3-wrap v3-wrap--wide"><HousePicker houses={pick} catalogHref={mainHref('/catalog')} /></div>
          </section>
        )}

        {plot.length > 0 && (
          <section className="v3-sec v3-sec--sky v4-sec" id="genplan">
            <div className="v3-wrap v4-head">
              <p className="v4-num">Генплан в 3D</p>
              <h2 className="v3-h2" data-move="lines">Какой участок <em>свободен</em></h2>
            </div>
            <div className="v3-wrap"><PlotPicker estates={plot} /></div>
          </section>
        )}

        <V4Final company={company} context={`Посёлок v4: ${e.name}`} lead={`Покажем посёлок «${e.name}» и дома в нём вживую или по видеосвязи. Ответим про участок, документы и ипотеку.`} />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
