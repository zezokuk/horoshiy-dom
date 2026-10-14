import type { Metadata } from 'next'
import { preload } from 'react-dom'
import { MortgageCalc } from '@/components/MortgageCalc'
import { CountUp, HeroAura } from '@/components/Motion'
import { PromoCards } from '@/components/PromoCards'
import { Words } from '@/components/Words'
import {
  getCompany,
  getEstates,
  getHouses,
  getProjects,
  getPromos,
  getRegions,
  img,
  srcSet,
} from '@/lib/data'
import { formatMillions, plural } from '@/lib/format'
import { mainHref, regionHref } from '@/lib/site'
import { JsonLd, faqLd, organizationLd } from '@/lib/seo'
import { estateView, houseView, promoView } from '@/lib/view'

export const revalidate = 60 // statuses and prices change in the admin; the page refreshes within a minute

export const metadata: Metadata = { alternates: { canonical: '/' } }

/**
 * The brand home: the company first (who we are, values, trust), then two ways in — build a house or buy a ready
 * one — and under both the places band that ties them together: where the houses stand and where we build
 * (for those not ready yet: they leave a contact «на будущее» and get promos and new estates later).
 */
export default async function Home() {
  const [company, regions, estates, houses, projects, promos] = await Promise.all([
    getCompany(),
    getRegions(),
    getEstates(),
    getHouses(),
    getProjects(),
    getPromos(),
  ])
  const free = houses.filter((h) => h.status === 'free').map(houseView)
  const priceFrom = free.length ? Math.min(...free.map((h) => h.price)) : null
  const years = company.since ? new Date().getFullYear() - company.since : null
  const estateViews = estates.map((e) => estateView(e, houses))
  const active = regions.filter((r) => r.status === 'active')
  const soon = regions.filter((r) => r.status === 'soon')
  const hero = company.heroPhoto
  const heroSrc = img(hero, 'wide')
  if (heroSrc)
    preload(heroSrc, {
      as: 'image',
      fetchPriority: 'high',
      imageSrcSet: srcSet(hero),
      imageSizes: '(min-width: 960px) 1600px, 660px',
    })

  // three different pictures: the «dream» project render (build), a real house on sale (buy; not the type already
  // shown in the hero), and an estate seen from above for the places band (its 3D poster — covers have the name printed on them)
  const buildProject = projects.find((p) => p.slug === 'tip-12') ?? projects[0]
  const buildPhoto = img(buildProject?.photo, 'card')
  const heroType = (company.heroCaption || '').match(/Тип \d+/)?.[0]
  const buyPhoto = (
    free.find(
      (h) =>
        h.photoCard &&
        h.title.split(' (')[0] !== heroType &&
        h.title.split(' (')[0] !== buildProject?.name,
    ) ?? free[0]
  )?.photoCard
  const lookPhoto = img(estates.find((e) => e.poster)?.poster, 'card') ?? estateViews[0]?.coverCard
  const minArea = Math.min(...projects.map((p) => p.area || 999))

  const ways = [
    {
      n: '01',
      href: mainHref('/build'),
      photo: buildPhoto,
      title: 'Построить дом',
      text: `${projects.length} проверенных проектов от ${minArea} м². Капитальный кирпичный дом под ключ за 6 месяцев.`,
      go: 'Как мы строим →',
    },
    {
      n: '02',
      href: mainHref('/catalog'),
      photo: buyPhoto,
      title: 'Купить готовый',
      text: `Дома с отделкой, участком и подключёнными коммуникациями. Можно заезжать после сделки.`,
      go: free.length
        ? `${free.length} ${plural(free.length, 'дом', 'дома', 'домов')}${priceFrom ? ` от ${formatMillions(priceFrom)}` : ''} →`
        : 'Смотреть дома →',
    },
  ]

  const faq = faqLd(company.faq)
  return (
    <>
      <JsonLd data={organizationLd(company, regions)} />
      {faq && <JsonLd data={faq} />}
      <section className="hero2">
        <div className="hero2__panel">
          <p className="eyebrow" style={{ color: 'var(--gold-soft)' }}>
            Строительная компания{company.since ? ` · с ${company.since} года` : ''}
          </p>
          <h1 className="hero2__title">
            <span className="line">
              <span>Хороший дом&nbsp;—</span>
            </span>
            <span className="line">
              <span style={{ ['--d' as string]: '120ms' }}>
                там, где <em>семья</em>
              </span>
            </span>
          </h1>
          <p className="hero2__lead">
            Строим и продаём капитальные кирпичные дома с участком
            {active.length ? ` — ${active.map((r) => r.name).join(', ')}` : ''}
            {soon.length ? `, скоро — ${soon.map((r) => r.name).join(', ')}` : ''}. Ипотека и
            регистрация за 2 недели, гарантия 5 лет.
          </p>
          <div className="btns">
            <a href="#choose" className="btn btn--gold">
              С чего начнём?
            </a>
            <a href={mainHref('/about')} className="btn btn--ghost">
              О компании
            </a>
          </div>
          <div className="hero2__stats">
            {!!years && (
              <div>
                <b>{years} лет</b>
                <span>строим дома</span>
              </div>
            )}
            <div>
              <b>{estates.length}</b>
              <span>{plural(estates.length, 'посёлок', 'посёлка', 'посёлков')}</span>
            </div>
            <div>
              <b>6 мес.</b>
              <span>дом под ключ</span>
            </div>
            <div>
              <b>5 лет</b>
              <span>гарантия</span>
            </div>
          </div>
        </div>
        <div className="hero2__photo">
          {heroSrc && (
            <img
              src={heroSrc}
              srcSet={srcSet(hero)}
              sizes="(min-width: 960px) 1600px, 660px"
              alt={typeof hero === 'object' ? (hero?.alt ?? '') : ''}
              fetchPriority="high"
              decoding="async"
            />
          )}
          <HeroAura />
          <div className="hero2__chips">
            <span>Готовые дома</span>
            <span>Стройка под ключ</span>
            <span>Газ и вода подключены</span>
          </div>
          {company.heroCaption && (
            <span className="hero2__caption">
              {company.heroCaption} · {(company.slogan || '').toLowerCase()}
            </span>
          )}
        </div>
      </section>

      <section className="section" id="choose">
        <div className="container">
          <div className="head" data-reveal>
            <span className="idx">Что вас интересует</span>
            <Words text="Два пути к *своему дому*" />
          </div>
          <div className="ways">
            <span className="ways__or" aria-hidden>
              или
            </span>
            {ways.map((w, i) => (
              <a
                key={w.n}
                href={w.href}
                className="way"
                data-reveal
                style={{ ['--d' as string]: `${i * 90}ms` }}
              >
                {w.photo && <img src={w.photo} alt="" loading="lazy" decoding="async" />}
                <div className="way__body">
                  <span className="way__num">{w.n}</span>
                  <h3>{w.title}</h3>
                  <p>{w.text}</p>
                  <span className="way__go">{w.go}</span>
                </div>
              </a>
            ))}
          </div>

          {/* the places tie both ways together: where the ready houses stand and where we build */}
          <div className="places" data-reveal>
            {lookPhoto && <img src={lookPhoto} alt="" loading="lazy" decoding="async" />}
            <div className="places__text">
              <span className="way__num">Где это всё</span>
              <h3>Посмотреть локации</h3>
              <p>
                Готовые дома стоят в наших посёлках, а построить можем и на вашем участке. Пока присматриваетесь —
                посмотрите места, сообщим об акциях и новых посёлках первыми.
              </p>
            </div>
            <ul className="places__list">
              {estateViews.map((e) => (
                <li key={e.slug}>
                  <a href={e.href}>
                    <b>{e.name}</b>
                    <span>{e.free ? `${e.free} ${plural(e.free, 'дом', 'дома', 'домов')} в продаже` : 'всё продано'}</span>
                  </a>
                </li>
              ))}
              {soon.map((r) => (
                <li key={r.slug} className="is-soon">
                  <a href={regionHref(r.slug)}>
                    <b>{r.name}</b>
                    <span>скоро</span>
                  </a>
                </li>
              ))}
            </ul>
            <a href={mainHref('/locations')} className="btn btn--gold places__go">
              Все локации на карте →
            </a>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container family">
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">Почему «хороший»</span>
              <Words text="Дом, в котором растут дети и собирается *семья*" />
              <p className="lead">
                Мы строим не квадратные метры, а место, куда хочется возвращаться: свой двор вместо
                подъезда, тишина вместо трассы, школа рядом вместо пробок.
              </p>
            </div>
            <div className="values">
              {(company.values || []).map((v, i) => (
                <div
                  key={v.id ?? v.title}
                  className="value"
                  data-reveal
                  style={{ ['--d' as string]: `${i * 80}ms` }}
                >
                  <i>{i + 1}</i>
                  <b>{v.title}</b>
                  <p>{v.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="family__collage" data-reveal>
            {estateViews.slice(0, 3).map((e) => (
              <figure key={e.slug}>
                <img src={e.coverCard} alt={`Обложка проекта «${e.name}»`} loading="lazy" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--green">
        <div className="container" style={{ display: 'grid', gap: 56 }}>
          <div className="numbers">
            {!!years && (
              <div data-reveal>
                <b>
                  <CountUp to={years} />
                </b>
                <span>лет строим дома</span>
              </div>
            )}
            <div data-reveal style={{ ['--d' as string]: '80ms' }}>
              <b>
                <CountUp
                  to={company.homesBuilt || estates.reduce((s, e) => s + (e.homes || 0), 0)}
                />
              </b>
              <span>{company.homesBuilt ? 'домов построено' : 'домов в наших посёлках'}</span>
            </div>
            <div data-reveal style={{ ['--d' as string]: '160ms' }}>
              <b>
                <CountUp to={projects.length} />
              </b>
              <span>проектов домов</span>
            </div>
            <div data-reveal style={{ ['--d' as string]: '240ms' }}>
              <b>
                <CountUp to={5} suffix=" лет" />
              </b>
              <span>гарантия на дом</span>
            </div>
          </div>
        </div>
      </section>

      {/* advantages on a light background: in the green section the white cards got light headings and became unreadable */}
      <section className="section">
        <div className="container">
          <div className="head" data-reveal>
            <span className="idx">Почему нам доверяют</span>
            <Words text="Недорогой дом может выглядеть как *особняк*" />
          </div>
          <div className="features">
            {(company.advantages || []).map((a, i) => (
              <div
                key={a.id ?? a.title}
                className="feature"
                data-reveal
                style={{ ['--d' as string]: `${(i % 3) * 80}ms` }}
              >
                <span className="feature__num">0{i + 1}</span>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {promos.length > 0 && (
        <section className="section section--paper" id="promo">
          <div className="container">
            <div className="head" data-reveal>
              <span className="idx">Акции</span>
              <Words text="Сейчас *выгодно*" />
            </div>
            <PromoCards promos={promos.map(promoView)} />
          </div>
        </section>
      )}

      <section className={`section ${promos.length ? '' : 'section--paper'}`}>
        <div className="container">
          <div className="head head--split">
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">Ипотека</span>
              <Words text="Посчитайте платёж за *минуту*" />
            </div>
            <div className="chips" data-reveal>
              {(company.mortgage || []).map((m) => (
                <span key={m.id ?? m.title} className="chip">
                  {m.title}
                </span>
              ))}
            </div>
          </div>
          <MortgageCalc price={free[0]?.price} />
        </div>
      </section>

      <section className="section">
        <div className="container split" style={{ alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 14 }} data-reveal>
            <span className="idx">Вопросы</span>
            <Words text="Частые *вопросы*" />
            <p className="lead">Не нашли ответ — позвоните, менеджер ответит за пару минут.</p>
          </div>
          <div className="faq" data-reveal>
            {(company.faq || []).map((f) => (
              <details key={f.id ?? f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
