import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EstateCard } from '@/components/EstateCard'
import { HouseCard } from '@/components/HouseCard'
import { LeadInline } from '@/components/LeadForm'
import { Words } from '@/components/Words'
import { getEstates, getHouses, getProjects, getRegion, img } from '@/lib/data'
import { formatMillions, plural, telHref } from '@/lib/format'
import { mainHref, regionHref } from '@/lib/site'
import { estateView, houseView } from '@/lib/view'

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

  const [estates, houses] = await Promise.all([getEstates(region.id), getHouses({ region: region.id })])
  const views = estates.map((e) => estateView(e, houses))
  const free = houses.filter((h) => h.status === 'free').map(houseView)
  const priceFrom = free.length ? Math.min(...free.map((h) => h.price)) : null
  // a real house, not an estate cover: covers carry the estate's name printed on them («ЮЖНЫЙ ВЕТЕР»)
  const cover = img(region.cover, 'wide') || free[0]?.photo || views[0]?.cover

  return (
    <>
      <div className="container intro">
        <div className="obj-hero">
          <div className="obj-hero__img">{cover && <img src={cover} alt={region.name} fetchPriority="high" />}</div>
          <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            <p className="eyebrow">Регион</p>
            <h1 className="title title--xl">{region.name}</h1>
            {region.tagline && <p className="lead">{region.tagline}</p>}
            {region.intro && <p>{region.intro}</p>}
            <div className="facts">
              <div className="fact">
                <b>{views.length}</b>
                <span>{plural(views.length, 'посёлок', 'посёлка', 'посёлков')}</span>
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
          <div className="head" data-reveal>
            <span className="idx">01 / Посёлки</span>
            <Words text="Где можно *жить*" />
          </div>
          <div className="grid grid--3">
            {views.map((e) => (
              <EstateCard key={e.slug} e={e} />
            ))}
          </div>
          <LeadInline
            title="Не знаете, какой посёлок выбрать?"
            text="Расскажите о семье и бюджете — подберём 2–3 свободных дома и пришлём подборку."
            cta="Подобрать дом"
            target={{ region: region.slug, context: `${region.name}: подбор посёлка`, phone: region.office?.phone, hours: region.office?.hours }}
          />
        </div>
      </section>

      {free.length > 0 && (
        <section className="section section--paper">
          <div className="container">
            <div className="head head--split">
              <div style={{ display: 'grid', gap: 14 }} data-reveal>
                <span className="idx">02 / В продаже</span>
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
            <span className="idx">03 / Офис продаж</span>
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
