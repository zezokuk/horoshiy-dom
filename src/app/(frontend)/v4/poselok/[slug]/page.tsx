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
import { DinskayaGenplan } from '@/v4/DinskayaGenplan'
import { V4Bar, V4Final, V4Fonts, V4Footer } from '@/v4/Shell'
import type { Region } from '@/payload-types'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 · страница посёлка (без старых обложек с воздушным змеем и без лишней прокрутки):
 *  - Первый экран: компактная шапка посёлка, цифры в одну строку и СРАЗУ интерактивный Генплан (для Динской — спутниковый 36 участков);
 *  - Под генпланом: компактный блок «Что рядом + Коммуникации» и сетка готовых домов в продаже с фильтром по типу в стиле ПИК.
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
    code: h.code,
    title: h.title,
    area: h.area,
    plot: h.plot,
    price: h.price,
    estate: h.estateName,
    photo: h.photoCard ?? h.photo,
    href: `/v4/dom/${h.code}`,
    caption: 'Изображение проекта',
  }))
  const plot = free.length && e.status !== 'planned' ? [{ name: e.name, href: v.href, estate: genplanEstate(e, all.length), houses: all }] : []
  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }
  const map = e.lat && e.lng ? `https://yandex.ru/maps/?pt=${e.lng},${e.lat}&z=15&l=map` : null

  const facts = [
    e.homes ? { v: String(e.homes), l: plural(e.homes, 'участок в посёлке', 'участка в посёлке', 'участков в посёлке') } : null,
    { v: String(free.length), l: `${plural(free.length, 'дом', 'дома', 'домов')} в продаже` },
    v.priceFrom ? { v: formatMillions(v.priceFrom), l: 'стоимость дома с участком от' } : null,
    (e.nearby ?? [])[0] ? { v: e.nearby![0].value, l: `до ${e.nearby![0].label}` } : null,
  ].filter((f): f is { v: string; l: string } => f !== null)

  return (
    <div className="v3 v4 v4-house">
      <V4Fonts />
      {region && <JsonLd data={estateLd(e, region, free)} />}
      <JsonLd data={breadcrumbsLd([{ name: 'Главная', url: mainHref('/') }, { name: e.name, url: v.href }])} />
      <V4Bar phone={company.phone} always />
      <MotionRoot smooth={false}>
        {/* Компактная шапка посёлка без старой обложки + сразу генплан на первом экране */}
        <section className="v4-estate-hero">
          <span className="v4-ghost" aria-hidden>{e.name.toLowerCase()}</span>
          <div className="v3-wrap">
            <nav className="v4-dom__crumbs" aria-label="Навигация">
              <a href="/v4">Главная</a>
              <span aria-hidden>/</span>
              <a href="/v4/poselki">Посёлки</a>
              <span aria-hidden>/</span>
              <span>{e.name}</span>
            </nav>

            <div className="v4-estate-top">
              <div>
                <span className={`v3-status${e.status !== 'selling' ? ' v3-status--off' : ''}`}>
                  <i />
                  {estateSale(v)}
                </span>
                <h1 className="v4-dom-h1">{e.name}</h1>
                <p className="v4-dom__where">
                  {[e.kind || 'Коттеджный посёлок', e.place].filter(Boolean).join(' · ')}
                  {e.tagline ? ` — ${e.tagline}` : ''}
                </p>
              </div>
              <div className="v4-pik-bar">
                {(e.slug === 'dinskaya' || plot.length > 0) && (
                  <a className="v4-pik-btn v4-pik-btn--accent" href="#genplan">
                    <span>Выбрать участок на генплане ↓</span>
                  </a>
                )}
                {free.length > 0 && (
                  <a className="v4-pik-btn" href="#doma">
                    <span>Дома списком ({free.length})</span>
                  </a>
                )}
                {map && (
                  <a className="v4-pik-btn v4-pik-btn--map" href={map} target="_blank" rel="noreferrer">
                    <span>Яндекс Карты</span>
                    <i className="v4-pik-mapdot" aria-hidden />
                  </a>
                )}
                <a className="v4-pik-btn" href="#evf-form">
                  <span>Записаться на показ</span>
                </a>
              </div>
            </div>

            {/* Компактная строка фактов о посёлке */}
            <div className="v4-estate-facts">
              {facts.map((f) => (
                <div className="v4-estate-fact" key={f.l}>
                  <b>{f.v}</b>
                  <span>{f.l}</span>
                </div>
              ))}
            </div>

            {/* СРАЗУ НА ПЕРВОМ ЭКРАНЕ — интерактивный генплан посёлка */}
            {e.slug === 'dinskaya' ? (
              <div id="genplan" className="v4-estate-gp">
                <DinskayaGenplan houses={all} family={fam} />
              </div>
            ) : plot.length > 0 ? (
              <div id="genplan" className="v4-estate-gp">
                <PlotPicker estates={plot} />
              </div>
            ) : null}
          </div>
        </section>

        {/* Что рядом и коммуникации — компактно в 2 колонки */}
        {((e.nearby ?? []).length > 0 || (e.utilities ?? []).length > 0) && (
          <section className="v3-sec v4-sec" style={{ paddingTop: 24, paddingBottom: 32 }}>
            <div className="v3-wrap v4-estate-info">
              {(e.nearby ?? []).length > 0 && (
                <div className="v4-estate-box">
                  <p className="v4-num">Локация и окружение</p>
                  <h3>Что рядом с посёлком</h3>
                  <ul className="v4-near">
                    {e.nearby!.map((n) => (
                      <li key={n.label}>
                        <span>{n.label}</span>
                        <b>{n.value}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {((e.utilities ?? []).length > 0 || (e.infrastructure ?? []).length > 0) && (
                <div className="v4-estate-box">
                  <p className="v4-num">Инженерия</p>
                  <h3>Коммуникации и благоустройство</h3>
                  <ul className="v4-chips-list">
                    {[...(e.utilities ?? []), ...(e.infrastructure ?? [])].map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Свободные дома в посёлке с фильтром по типу в стиле ПИК */}
        {free.length > 0 && (
          <section className="v3-sec v4-sec" id="doma" style={{ paddingTop: 24 }}>
            <div className="v3-wrap v4-head" style={{ marginBottom: 18 }}>
              <p className="v4-num">Готовые дома</p>
              <h2 className="v3-h2">
                {`${free.length} ${plural(free.length, 'дом', 'дома', 'домов')}`} <em>в «{e.name}»</em>
              </h2>
            </div>
            <div className="v3-wrap">
              <HousePicker houses={pick} catalogHref="/v4/doma" grid typeFilter />
            </div>
          </section>
        )}

        <V4Final
          company={company}
          context={`Посёлок v4: ${e.name}`}
          lead={`Покажем посёлок «${e.name}» и свободные участки вживую или по видеосвязи. Ответим про документы и ипотеку.`}
        />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
