import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EstatesView } from '@/components/EstatesView'
import { Genplan } from '@/components/Genplan'
import { HouseCard } from '@/components/HouseCard'
import { LeadInline } from '@/components/LeadForm'
import { RegionStage } from '@/components/RegionStage'
import { Words } from '@/components/Words'
import { PromoCards } from '@/components/PromoCards'
import { getEstates, getHouses, getProjects, getPromos, getRegion } from '@/lib/data'
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
  // each estate's slice on the first screen: a real house standing there (a free one first), not the estate cover —
  // covers carry the estate's name printed on them («ЮЖНЫЙ ВЕТЕР»); Тип 12's picture is a render, not a house
  const all = houses.map(houseView).filter((h) => h.photoCard && !h.title.startsWith('Тип 12'))
  const stage = views.map((v) => {
    const mine = all.filter((h) => h.estateSlug === v.slug)
    return { ...v, photo: (mine.find((h) => h.status === 'free') ?? mine[0])?.photoCard }
  })
  // 3D showcase: the estate with the most free houses (ties: the first in the admin's order)
  const top = [...estates].sort((a, b) => (views.find((v) => v.slug === b.slug)?.free ?? 0) - (views.find((v) => v.slug === a.slug)?.free ?? 0))[0]
  const showcase = top && {
    estate: top,
    houses: houses.filter((h) => (typeof h.estate === 'object' ? h.estate?.id : h.estate) === top.id).map(houseView),
  }

  return (
    <>
      <div className="container intro">
        <RegionStage
          name={region.name}
          tagline={region.tagline}
          note={region.intro}
          estates={stage}
          facts={[
            { value: String(built), label: plural(built, 'посёлок', 'посёлка', 'посёлков') },
            { value: String(free.length), label: `${plural(free.length, 'дом', 'дома', 'домов')} в продаже` },
            { value: priceFrom ? formatMillions(priceFrom) : '—', label: 'цена от' },
            { value: '5 лет', label: 'гарантия на дом' },
          ]}
          actions={
            <>
              <a href="#estates" className="btn btn--gold">
                Посёлки
              </a>
              <a href={regionHref(region.slug, '/catalog')} className="btn btn--ghost">
                Все дома с фильтрами
              </a>
            </>
          }
        />
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
