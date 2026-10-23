import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FamilyMortgage } from '@/components/FamilyMortgage'
import { HouseCard } from '@/components/HouseCard'
import { HouseReady } from '@/components/HouseReady'
import { MortgageCalc } from '@/components/MortgageCalc'
import { Pic } from '@/components/Pic'
import { PlanRender } from '@/components/PlanRender'
import { PlanTour } from '@/components/PlanTour'
import { getCompany, getHouse, getHouses, getRegion, img } from '@/lib/data'
import { STATUS_LABEL, formatArea, formatPrice, plural, telHref } from '@/lib/format'
import { mainHref, regionHref } from '@/lib/site'
import { JsonLd, breadcrumbsLd, houseLd } from '@/lib/seo'
import { houseTitle, houseView, roomsView, tourView } from '@/lib/view'
import type { Estate, Project, Region } from '@/payload-types'

export const revalidate = 60

type Props = { params: Promise<{ region: string; code: string }> }

async function load(params: Props['params']) {
  const { region: rs, code } = await params
  const [region, house] = await Promise.all([getRegion(rs), getHouse(code)])
  const estate = house?.estate as Estate | undefined
  if (!region || !house || (estate?.region as Region)?.slug !== region.slug) return null
  return { region, house, estate: estate! }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params)
  if (!d) return {}
  const { house: h, estate: e, region } = d
  return {
    title: `Дом ${formatArea(h.area)} м² в посёлке «${e.name}» — ${formatPrice(h.price)}`,
    description: [houseTitle(h), h.plot && `участок ${h.plot}`, e.place].filter(Boolean).join(', ') + `. ${STATUS_LABEL[h.status]}.`,
    alternates: { canonical: regionHref(region.slug, `/houses/${h.code}`) },
  }
}

/**
 * The house page, laid out like the client's house slide: the photo with «площадь дома / участок»,
 * then the plan — with circles that open room videos when the project has them — next to the price,
 * then the family-mortgage calculation in cards.
 */
export default async function HousePage({ params }: Props) {
  const d = await load(params)
  if (!d) notFound()
  const { region, house, estate: e } = d
  const h = houseView(house)
  const project = typeof house.project === 'object' ? (house.project as Project | null) : null
  const tour = tourView(project)
  // the circles are placed on the project's plan picture, so with a tour we show that plan
  const planSrc = tour.length ? img(project?.plan, 'wide') : h.plan
  // no room videos but the project has a furnished render of its plan: that one first, with the room areas —
  // only when this house has the project's own layout («Тип 5 (В2)», «(В3)» share the project but not the plan)
  const mediaId = (m: unknown) => (m && typeof m === 'object' ? (m as { id?: unknown }).id : m)
  const samePlan = !house.plan || mediaId(house.plan) === mediaId(project?.plan)
  const render = tour.length || !samePlan ? null : img(project?.render, 'wide')
  const [company, regionHouses] = await Promise.all([getCompany(), getHouses({ region: region.id, status: 'free' })])
  const similar = regionHouses
    .filter((x) => x.code !== h.code)
    .map(houseView)
    .sort((a, b) => Math.abs(a.price - h.price) - Math.abs(b.price - h.price))
    .slice(0, 3)
  const phone = region.office?.phone || company.phone
  const plot = h.plot?.replace(/\s*сот\.?$/, '')
  // a house just added in the admin may have no photo yet: the project's picture, else a slim band with the facts
  const photo = h.photo ?? img(project?.photo, 'wide')
  const photoPhone = h.photoCard ?? img(project?.photo, 'card')

  return (
    <>
      <JsonLd data={houseLd(h, e, region, company.legalName || company.name)} />
      <JsonLd
        data={breadcrumbsLd([
          { name: region.name, url: regionHref(region.slug) },
          { name: e.name, url: regionHref(region.slug, `/objects/${e.slug}`) },
          { name: h.title, url: h.href },
        ])}
      />
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={regionHref(region.slug)}>{region.name}</a>
          <a href={regionHref(region.slug, `/objects/${e.slug}`)}>{e.name}</a>
          <span>{h.title}</span>
        </nav>
      </div>

      <div className="container hs">
        <div className={`house__photo hs__photo ${photo ? '' : 'hs__photo--none'}`}>
          <HouseReady />
          {photo && <Pic src={photo} phone={photoPhone} alt={`${h.title} в посёлке ${e.name}`} priority />}
          <span className={`badge badge--${h.status}`}>{STATUS_LABEL[h.status]}</span>
          {/* «Тип 12»: the client's render, not a built house (as on its catalog card) */}
          {photo && h.title.startsWith('Тип 12') && <span className="photo-note photo-note--big">Визуализация проекта</span>}
          <div className="hs__facts">
            <div>
              <span>Площадь дома</span>
              <b>
                {h.area.toLocaleString('ru-RU')} м²{h.mansard ? <small> + {h.mansard} мансарда</small> : null}
              </b>
            </div>
            {plot && (
              <div>
                <span>Участок</span>
                <b>
                  {plot} <small>сот.</small>
                </b>
              </div>
            )}
          </div>
        </div>

        <div className={`hs__grid ${planSrc || render ? '' : 'hs__grid--solo'}`}>
          {(planSrc || render) && (
            <div className="hs__plan">
              {tour.length && planSrc ? (
                <PlanTour plan={planSrc} alt={`Планировка: ${h.title}`} points={tour} />
              ) : render ? (
                <PlanRender render={render} plan={planSrc} rooms={roomsView(project)} alt={`Планировка: ${h.title}`} />
              ) : (
                <div className="plan">
                  <img src={planSrc} alt={`Планировка: ${h.title}`} loading="lazy" />
                </div>
              )}
            </div>
          )}

          <aside className="house__side hs__side">
            <p className="eyebrow">{[e.name, e.place].filter(Boolean).join(' · ')}</p>
            <h1 className="title title--md">{h.title}</h1>
            <div className="hs__price">
              <span>Стоимость дома</span>
              <div className="house__price">{formatPrice(h.price)}</div>
            </div>
            {!!(h.bedrooms || h.bathrooms) && (
              <div className="specs">
                {!!h.bedrooms && (
                  <div>
                    <b>{h.bedrooms}</b>
                    <span>{plural(h.bedrooms, 'спальня', 'спальни', 'спален')}</span>
                  </div>
                )}
                {!!h.bathrooms && (
                  <div>
                    <b>{h.bathrooms}</b>
                    <span>{plural(h.bathrooms, 'санузел', 'санузла', 'санузлов')}</span>
                  </div>
                )}
              </div>
            )}
            {h.features.length > 0 && (
              <div className="chips">
                {h.features.map((f) => (
                  <span key={f} className="chip">
                    {f}
                  </span>
                ))}
              </div>
            )}
            {h.status === 'free' ? (
              <a href="#lead" className="btn btn--gold">
                Записаться на показ
              </a>
            ) : (
              <>
                <p>Этот дом уже {h.status === 'sold' ? 'продан' : 'забронирован'}. Можем построить такой же проект за 6 месяцев или подобрать свободный дом.</p>
                <a href={regionHref(region.slug, '/catalog')} className="btn btn--green">
                  Свободные дома
                </a>
              </>
            )}
            <a href="#mortgage" className="hs__mortgage">
              <span>
                Расчёт по семейной ипотеке
                <b>{company.family?.rate ?? 6} % · {company.family?.years ?? 30} лет</b>
              </span>
              <i aria-hidden>→</i>
            </a>
            {phone && (
              <a href={telHref(phone)} className="btn btn--ghost" style={{ color: 'var(--green-deep)' }}>
                Позвонить менеджеру
              </a>
            )}
          </aside>
        </div>
      </div>

      <section className="section section--paper" id="mortgage">
        <div className="container" style={{ display: 'grid', gap: 28 }}>
          <div className="head">
            <p className="eyebrow">Дом в ипотеку — реально</p>
            <h2 className="title title--md">Сколько будет платёж за этот дом</h2>
          </div>
          <FamilyMortgage price={h.price} plans={house.mortgagePlans} family={company.family} />
          <details className="hs__calc">
            <summary>Посчитать свой вариант: другой взнос, срок или программа</summary>
            <MortgageCalc price={h.price} />
          </details>
          <p className="note">
            Программы и условия — на странице <a href={mainHref('/mortgage')}>«Ипотека»</a>.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split" style={{ alignItems: 'start' }}>
          {!!company.finishing?.length && (
            <div style={{ display: 'grid', gap: 16 }}>
              <p className="eyebrow">Что входит</p>
              <h2 className="title title--md">Предчистовая отделка</h2>
              <ul className="dots">
                {company.finishing.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          {!!e.utilities?.length && (
            <div style={{ display: 'grid', gap: 16 }}>
              <p className="eyebrow">Коммуникации</p>
              <h2 className="title title--md">Что есть в посёлке</h2>
              <div className="chips">
                {e.utilities.map((x) => (
                  <span key={x} className="chip">
                    {x}
                  </span>
                ))}
              </div>
              <a href={regionHref(region.slug, `/objects/${e.slug}`)} className="btn btn--green" style={{ justifySelf: 'start' }}>
                О посёлке «{e.name}»
              </a>
            </div>
          )}
        </div>
      </section>

      {similar.length > 0 && (
        <section className="section section--paper">
          <div className="container">
            <div className="head">
              <p className="eyebrow">Похожие по цене</p>
              <h2 className="title title--md">Свободные дома</h2>
            </div>
            <div className="grid grid--3">
              {similar.map((s) => (
                <HouseCard key={s.code} h={s} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
