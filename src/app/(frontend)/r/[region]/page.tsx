import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EstatesView } from '@/components/EstatesView'
import { Genplan } from '@/components/Genplan'
import { HouseCard } from '@/components/HouseCard'
import { LeadInline } from '@/components/LeadForm'
import { Words } from '@/components/Words'
import { PromoCards } from '@/components/PromoCards'
import { getEstates, getHouses, getProjects, getPromos, getRegion, img } from '@/lib/data'
import { formatMillions, plural, telHref } from '@/lib/format'
import { mainHref, regionHref } from '@/lib/site'
import { byEstateStatus, estateView, genplanEstate, houseView, promoView } from '@/lib/view'

export const revalidate = 60

type Props = { params: Promise<{ region: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getRegion((await params).region)
  if (!r) return {}
  return {
    title: r.status === 'soon' ? `${r.name} — скоро` : `Дома с участком: ${r.name}`,
    description: r.intro || r.tagline || undefined,
    alternates: { canonical: regionHref(r.slug) },
  }
}

export default async function RegionPage({ params }: Props) {
  const region = await getRegion((await params).region)
  if (!region) notFound()

  if (region.status === 'soon') {
    const projects = await getProjects()
    return (
      <>
        <div className="container intro">
          <div className="soon-hero">
            <p className="eyebrow">Скоро · {region.name}</p>
            <h1 className="title title--xl">{region.tagline || `Скоро: ${region.name}`}</h1>
            {region.intro && <p className="lead">{region.intro}</p>}
            <div className="btns">
              <a href="#lead" className="btn btn--gold">
                Записаться в лист ожидания
              </a>
              <a href={mainHref('/projects')} className="btn btn--ghost" style={{ color: 'var(--green-deep)' }}>
                Наши проекты домов
              </a>
            </div>
          </div>
        </div>
        <section className="section">
          <div className="container">
            <div className="head" data-reveal>
              <span className="idx">Пока готовим</span>
              <Words text="Посмотрите, *как мы строим*" />
              <p className="lead">
                {projects.length} проектов домов, по которым мы строим сегодня. Дома в продаже — в других регионах, их можно посмотреть уже сейчас.
              </p>
            </div>
            <div className="btns">
              <a href={mainHref('/catalog')} className="btn btn--green">
                Готовые дома в других регионах
              </a>
              <a href={mainHref('/about')} className="btn btn--ghost" style={{ color: 'var(--green-deep)' }}>
                О компании
              </a>
            </div>
          </div>
        </section>
      </>
    )
  }

  const [estates, houses, promos] = await Promise.all([getEstates(region.id), getHouses({ region: region.id }), getPromos(region.id)])
  const views = byEstateStatus(estates.map((e) => estateView(e, houses)))
  const built = views.filter((v) => v.status !== 'planned').length
  const free = houses.filter((h) => h.status === 'free').map(houseView)
  const priceFrom = free.length ? Math.min(...free.map((h) => h.price)) : null
  // a real house, not an estate cover: covers carry the estate's name printed on them («ЮЖНЫЙ ВЕТЕР»)
  const cover = img(region.cover, 'wide') || free[0]?.photo || houses.map(houseView).find((h) => h.photo)?.photo || views.find((v) => v.cover)?.cover
  // 3D showcase: the estate with the most free houses (ties: the first in the admin's order)
  const top = [...estates].sort((a, b) => (views.find((v) => v.slug === b.slug)?.free ?? 0) - (views.find((v) => v.slug === a.slug)?.free ?? 0))[0]
  const showcase = top && {
    estate: top,
    houses: houses.filter((h) => (typeof h.estate === 'object' ? h.estate?.id : h.estate) === top.id).map(houseView),
  }

  return (
    <>
      <div className="container intro">
        <div className={`obj-hero ${cover ? '' : 'obj-hero--solo'}`}>
          {cover && (
            <div className="obj-hero__img">
              <img src={cover} alt={region.name} fetchPriority="high" />
            </div>
          )}
          <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            <p className="eyebrow">Регион</p>
            <h1 className="title title--xl">{region.name}</h1>
            {region.tagline && <p className="lead">{region.tagline}</p>}
            {region.intro && <p>{region.intro}</p>}
            <div className="facts">
              <div className="fact">
                <b>{built}</b>
                <span>{plural(built, 'посёлок', 'посёлка', 'посёлков')}</span>
              </div>
              <div className="fact">
                <b>{free.length}</b>
                <span>{plural(free.length, 'дом', 'дома', 'домов')} в продаже</span>
              </div>
              <div className="fact">
                <b>{priceFrom ? formatMillions(priceFrom) : '—'}</b>
                <span>цена от</span>
              </div>
              <div className="fact">
                <b>5 лет</b>
                <span>гарантия на дом</span>
              </div>
            </div>
            <div className="btns">
              <a href="#estates" className="btn btn--green">
                Посёлки
              </a>
              <a href={regionHref(region.slug, '/catalog')} className="btn btn--ghost" style={{ color: 'var(--green-deep)' }}>
                Все дома с фильтрами
              </a>
            </div>
          </div>
        </div>
      </div>

      <section className="section" id="estates">
        <div className="container">
          <div className="head head--split">
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">01 / Посёлки</span>
              <Words text="Где можно *жить*" />
            </div>
            <p className="lead" data-reveal>
              Выберите посёлок на карте — откроется его 3D-генплан со свободными домами и ценами.
            </p>
          </div>
          <EstatesView estates={views} />
          <LeadInline
            title="Не знаете, какой посёлок выбрать?"
            text="Расскажите о семье и бюджете — подберём 2–3 свободных дома и пришлём подборку."
            cta="Подобрать дом"
            target={{ region: region.slug, context: `${region.name}: подбор посёлка`, phone: region.office?.phone, hours: region.office?.hours }}
          />
        </div>
      </section>

      {promos.length > 0 && (
        <section className="section" id="promo" style={{ paddingTop: 0 }}>
          <div className="container">
            <PromoCards promos={promos.map(promoView)} />
          </div>
        </section>
      )}

      {showcase && (
        <section className="section section--paper" id="genplan3d">
          <div className="container">
            <div className="head head--split">
              <div style={{ display: 'grid', gap: 14 }} data-reveal>
                <span className="idx">02 / Посёлок в 3D</span>
                <Words text={`Посмотрите на «${showcase.estate.name}» *сверху*`} />
              </div>
              <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }} data-reveal>
                <p className="lead">
                  Покрутите посёлок, приблизьте улицу и нажмите на дом: свободные подсвечены и подписаны ценой. Так вы сразу видите соседей, участок и
                  дорогу.
                </p>
                <a href={regionHref(region.slug, `/objects/${showcase.estate.slug}`)} className="btn btn--green">
                  Подробнее о посёлке
                </a>
              </div>
            </div>
            <Genplan estate={genplanEstate(showcase.estate, showcase.houses.length)} houses={showcase.houses} />
          </div>
        </section>
      )}

      {free.length > 0 && (
        <section className={`section ${showcase ? '' : 'section--paper'}`}>
          <div className="container">
            <div className="head head--split">
              <div style={{ display: 'grid', gap: 14 }} data-reveal>
                <span className="idx">{showcase ? '03' : '02'} / В продаже</span>
                <Words text="Свободные *дома*" />
              </div>
              <a href={regionHref(region.slug, '/catalog')} className="btn btn--green" data-reveal>
                Все {free.length} {plural(free.length, 'дом', 'дома', 'домов')}
              </a>
            </div>
            <div className="grid grid--3">
              {free.slice(0, 6).map((h) => (
                <HouseCard key={h.code} h={h} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section" id="office">
        <div className="container split" style={{ alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 14 }} data-reveal>
            <span className="idx">{String(2 + (showcase ? 1 : 0) + (free.length ? 1 : 0)).padStart(2, '0')} / Офис продаж</span>
            <Words text="Приезжайте *в гости*" />
            <p className="lead">Покажем построенные дома вживую или проведём показ по видеосвязи, если вы в другом городе.</p>
          </div>
          <div className="office" data-reveal>
            <b>{region.name}</b>
            {region.office?.address && <span>{region.office.address}</span>}
            {region.office?.hours && <span>{region.office.hours}</span>}
            {region.office?.phone && (
              <a href={telHref(region.office.phone)} className="btn btn--green" style={{ justifySelf: 'start' }}>
                {region.office.phone}
              </a>
            )}
            {region.lat && region.lng && (
              <a
                href={`https://yandex.ru/maps/?ll=${region.lng},${region.lat}&z=${region.zoom || 10}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn--ghost"
                style={{ color: 'var(--green-deep)', justifySelf: 'start' }}
              >
                Открыть на Яндекс Картах
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
