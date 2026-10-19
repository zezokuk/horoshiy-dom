import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HouseCard } from '@/components/HouseCard'
import { LeadForm } from '@/components/LeadForm'
import { Nearby } from '@/components/Nearby'
import { getCompany, getHouses, getLanding, getRegion, img } from '@/lib/data'
import { formatMillions, plural } from '@/lib/format'
import { regionHref } from '@/lib/site'
import { houseView } from '@/lib/view'
import type { Estate } from '@/payload-types'

// a landing for ads: counts and statuses must be fresh, as on the estate pages
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ region: string; slug: string }> }

async function load(params: Props['params']) {
  const { region: rs, slug } = await params
  const region = await getRegion(rs)
  if (!region || region.status !== 'active') return null
  const landing = await getLanding(region.id, slug)
  return landing ? { region, landing } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params)
  if (!d) return {}
  return {
    title: d.landing.title,
    description: d.landing.offer || undefined,
    alternates: { canonical: regionHref(d.region.slug, `/p/${d.landing.slug}`) },
  }
}

/**
 * Promo page of a district (krd.домен.ru/p/<адрес>): offer and form on the first screen, then the free houses of the
 * estate, what is near in minutes, utilities and the company's guarantees — facts only, all from the admin.
 */
export default async function LandingPage({ params }: Props) {
  const d = await load(params)
  if (!d) notFound()
  const { region, landing: l } = d
  const estate = l.estate && typeof l.estate === 'object' ? (l.estate as Estate) : null
  const [company, raw] = await Promise.all([getCompany(), estate ? getHouses({ estate: estate.id }) : Promise.resolve([])])
  const houses = raw.map(houseView)
  const free = houses.filter((h) => h.status === 'free').sort((a, b) => a.price - b.price)
  const priceFrom = free.length ? free[0].price : null
  const coming = estate?.status === 'planned'
  const photo = img(l.cover, 'wide') ?? free[0]?.photo ?? img(estate?.poster, 'wide') ?? img(estate?.cover, 'wide')
  const years = company.since ? new Date().getFullYear() - company.since : null

  // facts from the admin, or the estate's own numbers
  const facts =
    l.facts?.length
      ? l.facts.map((f) => ({ value: f.value, label: f.label }))
      : [
          priceFrom && { value: formatMillions(priceFrom).replace(' ₽', ''), label: 'цена дома от, ₽' },
          free.length > 0 && { value: String(free.length), label: `${plural(free.length, 'дом', 'дома', 'домов')} в продаже` },
          estate?.nearby?.[0] && { value: estate.nearby[0].value, label: `до: ${estate.nearby[0].label}` },
          { value: '5 лет', label: 'гарантия на дом' },
        ].filter((f): f is { value: string; label: string } => Boolean(f))

  const target = {
    region: region.slug,
    estate: estate?.slug,
    context: `Промо «${l.title}»`,
    interest: coming ? ('future' as const) : ('buy' as const),
    phone: region.office?.phone,
    hours: region.office?.hours,
  }

  return (
    <>
      <section className="lp-hero">
        <div className="container lp-hero__grid">
          <div className="lp-hero__text">
            <p className="eyebrow">{[region.name, estate?.place].filter(Boolean).join(' · ')}</p>
            <h1 className="lp-hero__title">{l.title}</h1>
            {l.offer && <p className="lp-hero__offer">{l.offer}</p>}
            {facts.length > 0 && (
              <dl className="lp-facts">
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt>{f.value}</dt>
                    <dd>{f.label}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="lp-hero__form" id="form">
            <b>{coming ? 'Узнать о старте продаж' : 'Подборка свободных домов'}</b>
            <p>{l.formNote}</p>
            {/* light: the inputs are styled for the white card (the default form is for dark backgrounds) */}
            <LeadForm light cta={l.cta || 'Отправить'} target={target} />
          </div>
        </div>
        {photo && (
          <div className="container">
            <div className="lp-hero__photo">
              <img src={photo} alt={estate ? `Дом в посёлке ${estate.name}` : l.title} fetchPriority="high" />
            </div>
          </div>
        )}
      </section>

      {free.length > 0 && estate && (
        <section className="section">
          <div className="container">
            <div className="head head--split">
              <div style={{ display: 'grid', gap: 10 }}>
                <p className="eyebrow">В продаже сейчас</p>
                <h2 className="title title--lg">
                  {free.length} {plural(free.length, 'свободный дом', 'свободных дома', 'свободных домов')} в посёлке «{estate.name}»
                </h2>
              </div>
              <a href={regionHref(region.slug, `/objects/${estate.slug}`)} className="btn btn--ghost" style={{ color: 'var(--green-deep)' }}>
                Генплан посёлка в 3D →
              </a>
            </div>
            <div className="grid grid--3">
              {free.slice(0, 6).map((h) => (
                <HouseCard key={h.code} h={h} showEstate={false} />
              ))}
            </div>
          </div>
        </section>
      )}

      {!!estate?.nearby?.length && (
        <section className="section section--paper">
          <div className="container">
            <div className="head">
              <p className="eyebrow">Что рядом</p>
              <h2 className="title title--lg">{estate.address || estate.place}</h2>
            </div>
            <Nearby items={estate.nearby} />
            {!!estate.utilities?.length && (
              <div className="chips" style={{ marginTop: 28 }}>
                {estate.utilities.map((u) => (
                  <span key={u} className="chip">
                    {u}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          {/* the site-wide form follows right below (Shell); a lead from it knows this page by its address */}
          <ul className="lp-proof">
            {!!years && (
              <li>
                <b>{years} лет</b>
                <span>строим дома{company.since ? `, с ${company.since} года` : ''}</span>
              </li>
            )}
            <li>
              <b>6 мес.</b>
              <span>дом под ключ</span>
            </li>
            <li>
              <b>5 лет</b>
              <span>гарантия на дом</span>
            </li>
            <li>
              <b>2 недели</b>
              <span>ипотека и регистрация</span>
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}
