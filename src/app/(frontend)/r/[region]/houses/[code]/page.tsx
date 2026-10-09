import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HouseCard } from '@/components/HouseCard'
import { HouseReady } from '@/components/HouseReady'
import { MortgageCalc } from '@/components/MortgageCalc'
import { getCompany, getHouse, getHouses, getRegion } from '@/lib/data'
import { STATUS_LABEL, formatPrice, telHref } from '@/lib/format'
import { mainHref, regionHref } from '@/lib/site'
import { houseTitle, houseView } from '@/lib/view'
import type { Estate, Region } from '@/payload-types'

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
    title: `Дом ${h.area} м² в посёлке «${e.name}» — ${formatPrice(h.price)}`,
    description: `${houseTitle(h)}, участок ${h.plot || '—'}, ${e.place}. ${STATUS_LABEL[h.status]}.`,
    alternates: { canonical: regionHref(region.slug, `/houses/${h.code}`) },
  }
}

export default async function HousePage({ params }: Props) {
  const d = await load(params)
  if (!d) notFound()
  const { region, house, estate: e } = d
  const h = houseView(house)
  const [company, regionHouses] = await Promise.all([getCompany(), getHouses({ region: region.id, status: 'free' })])
  const similar = regionHouses
    .filter((x) => x.code !== h.code)
    .map(houseView)
    .sort((a, b) => Math.abs(a.price - h.price) - Math.abs(b.price - h.price))
    .slice(0, 3)
  const phone = region.office?.phone || company.phone

  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={regionHref(region.slug)}>{region.name}</a>
          <a href={regionHref(region.slug, `/objects/${e.slug}`)}>{e.name}</a>
          <span>{h.title}</span>
        </nav>
      </div>

      <div className="container house">
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="house__photo">
            <HouseReady />
            {h.photo && <img src={h.photo} alt={`${h.title} в посёлке ${e.name}`} fetchPriority="high" />}
            <span className={`badge badge--${h.status}`}>{STATUS_LABEL[h.status]}</span>
          </div>
          {h.plan && (
            <div className="plan">
              <img src={h.plan} alt={`Планировка: ${h.title}`} loading="lazy" />
            </div>
          )}
        </div>

        <aside className="house__side">
          <p className="eyebrow">
            {e.name} · {e.place}
          </p>
          <h1 className="title title--md">
            Дом {h.area.toLocaleString('ru-RU')} м²{h.mansard ? ` + ${h.mansard} м² мансарда` : ''}
          </h1>
          <div className="house__price">{formatPrice(h.price)}</div>
          <div className="specs">
            <div>
              <b>{h.plot || '—'}</b>
              <span>участок</span>
            </div>
            <div>
              <b>{h.title}</b>
              <span>проект</span>
            </div>
            <div>
              <b>{h.bedrooms ?? '—'}</b>
              <span>спальни</span>
            </div>
            <div>
              <b>{h.bathrooms ?? '—'}</b>
              <span>санузлы</span>
            </div>
          </div>
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
          {phone && (
            <a href={telHref(phone)} className="btn btn--ghost" style={{ color: 'var(--green-deep)' }}>
              Позвонить менеджеру
            </a>
          )}
        </aside>
      </div>

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
              <h2 className="title title--md">Всё подключено</h2>
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

      <section className="section section--paper">
        <div className="container">
          <div className="head">
            <p className="eyebrow">Ипотека</p>
            <h2 className="title title--md">Сколько будет платёж за этот дом</h2>
          </div>
          <MortgageCalc price={h.price} />
          <p className="note" style={{ marginTop: 12 }}>
            Программы и условия — на странице <a href={mainHref('/mortgage')}>«Ипотека»</a>. Условия определяет банк-кредитор.
          </p>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="section">
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
