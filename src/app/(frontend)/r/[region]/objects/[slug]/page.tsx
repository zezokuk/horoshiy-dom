import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EstatesMap } from '@/components/EstatesMap'
import { Genplan } from '@/components/Genplan'
import { HouseCard } from '@/components/HouseCard'
import { LeadInline } from '@/components/LeadForm'
import { getEstate, getHouses, getRegion, img } from '@/lib/data'
import { formatMillions, plural } from '@/lib/format'
import { regionHref } from '@/lib/site'
import { JsonLd, breadcrumbsLd, estateLd } from '@/lib/seo'
import { estateView, genplanEstate, houseView } from '@/lib/view'
import type { Region } from '@/payload-types'

export const revalidate = 60

type Props = { params: Promise<{ region: string; slug: string }> }

async function load(params: Props['params']) {
  const { region: rs, slug } = await params
  const [region, estate] = await Promise.all([getRegion(rs), getEstate(slug)])
  // an estate is shown only under its own region: /r/msk/objects/kalina/ is a 404, not a duplicate
  if (!region || !estate || (estate.region as Region)?.slug !== region.slug) return null
  return { region, estate }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params)
  if (!d) return {}
  const { estate: e, region } = d
  return {
    title: `${e.kind || 'Посёлок'} «${e.name}», ${e.place}`,
    description: [e.tagline, e.description].filter(Boolean).join('. '),
    alternates: { canonical: regionHref(region.slug, `/objects/${e.slug}`) },
  }
}

export default async function EstatePage({ params }: Props) {
  const d = await load(params)
  if (!d) notFound()
  const { region, estate: e } = d
  const rawHouses = await getHouses({ estate: e.id })
  const houses = rawHouses.map(houseView)
  const free = houses.filter((h) => h.status === 'free')
  const scheme = img(e.scheme, 'wide')
  const sorted = [...houses].sort((a, b) => (a.status === b.status ? a.price - b.price : a.status === 'free' ? -1 : 1))
  // a fresh estate may have no houses or pictures yet: fall back to its 3D poster or cover, else no picture column
  const photo = free[0]?.photo ?? houses.find((h) => h.photo)?.photo ?? img(e.poster, 'wide') ?? img(e.cover, 'wide')
  const priceFrom = free.length ? Math.min(...free.map((h) => h.price)) : null
  const plot = houses.find((h) => h.plot)?.plot?.replace(/\s*сот\.?$/, '')
  const eyebrow = [e.kind, e.place].filter(Boolean).join(' · ')
  const target = { region: region.slug, context: `${region.name}: ${e.name}`, phone: region.office?.phone, hours: region.office?.hours }

  return (
    <>
      <JsonLd data={estateLd(e, region, houses)} />
      <JsonLd
        data={breadcrumbsLd([
          { name: region.name, url: regionHref(region.slug) },
          { name: e.name, url: regionHref(region.slug, `/objects/${e.slug}`) },
        ])}
      />
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={regionHref(region.slug)}>{region.name}</a>
          <span>{e.name}</span>
        </nav>
        <div className={`obj-hero ${photo ? '' : 'obj-hero--solo'}`}>
          {photo && (
            <div className="obj-hero__img">
              <img src={photo} alt={`Дом в посёлке ${e.name}`} fetchPriority="high" />
            </div>
          )}
          <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1 className="title title--xl">{e.name}</h1>
            {e.tagline && <p className="lead">{e.tagline}</p>}
            {e.description && <p>{e.description}</p>}
            <div className="facts">
              {!!e.homes && (
                <div className="fact">
                  <b>{e.homes}</b>
                  <span>{plural(e.homes, 'дом', 'дома', 'домов')} в проекте</span>
                </div>
              )}
              <div className="fact">
                <b>{free.length}</b>
                <span>свободно сейчас</span>
              </div>
              {priceFrom && (
                <div className="fact">
                  <b>{formatMillions(priceFrom)}</b>
                  <span>цена от</span>
                </div>
              )}
              {plot && (
                <div className="fact">
                  <b>{plot}</b>
                  <span>соток участок</span>
                </div>
              )}
            </div>
            <div className="btns">
              <a href="#genplan" className="btn btn--green">
                Смотреть генплан
              </a>
              <a href="#lead" className="btn btn--ghost" style={{ color: 'var(--green-deep)' }}>
                Записаться на показ
              </a>
            </div>
          </div>
        </div>
      </div>

      <section className="section" id="genplan" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="head head--split">
            <div style={{ display: 'grid', gap: 14 }}>
              <p className="eyebrow">Генплан</p>
              <h2 className="title title--lg">Выберите дом в 3D</h2>
            </div>
            <p className="lead">Покрутите посёлок и нажмите на дом. Свободные подсвечены зелёным и подписаны ценой — увидите фото, площадь и участок.</p>
          </div>
          <Genplan estate={genplanEstate(e, houses.length)} houses={houses} />
          {scheme && (
            <details className="scheme-src">
              <summary>Генплан застройщика</summary>
              <img src={scheme} alt={`Генплан «${e.name}» от застройщика`} loading="lazy" />
            </details>
          )}
          <LeadInline title={`Показ в «${e.name}»`} text="Покажем дома вживую или по видеосвязи — в удобное время, без обязательств." cta="Записаться на показ" target={target} />
        </div>
      </section>

      <section className="section section--paper">
        <div className="container">
          <div className="head">
            <p className="eyebrow">Дома</p>
            <h2 className="title title--lg">{free.length ? `${free.length} ${plural(free.length, 'дом', 'дома', 'домов')} в продаже` : 'Все дома проданы'}</h2>
            {!free.length && <p className="lead">Посмотрите свободные дома в соседних посёлках или оставьте заявку — сообщим о новой очереди.</p>}
          </div>
          <div className="grid grid--3">
            {sorted.map((h) => (
              <HouseCard key={h.code} h={h} showEstate={false} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split" style={{ alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 18 }}>
            <p className="eyebrow">Расположение</p>
            <h2 className="title title--md">{e.address || e.place}</h2>
            {!!e.nearby?.length && (
              <ul className="nearby">
                {e.nearby.map((n) => (
                  <li key={n.id ?? n.label}>
                    <span>{n.label}</span>
                    <b>{n.value}</b>
                  </li>
                ))}
              </ul>
            )}
            {!!e.infrastructure?.length && (
              <>
                <h3 className="title" style={{ fontSize: 24, marginTop: 10 }}>
                  Рядом
                </h3>
                <ul className="dots">
                  {e.infrastructure.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </>
            )}
            {!!e.utilities?.length && (
              <>
                <h3 className="title" style={{ fontSize: 24, marginTop: 10 }}>
                  Коммуникации
                </h3>
                <div className="chips">
                  {e.utilities.map((u) => (
                    <span key={u} className="chip">
                      {u}
                    </span>
                  ))}
                </div>
              </>
            )}
            {e.lat && e.lng && (
              <a className="btn btn--green" style={{ justifySelf: 'start', marginTop: 8 }} href={`https://yandex.ru/maps/?rtext=~${e.lat},${e.lng}&rtt=auto`} target="_blank" rel="noreferrer">
                Построить маршрут
              </a>
            )}
          </div>
          {e.lat && e.lng ? <EstatesMap estates={[estateView(e, rawHouses)]} /> : null}
        </div>
      </section>
    </>
  )
}
