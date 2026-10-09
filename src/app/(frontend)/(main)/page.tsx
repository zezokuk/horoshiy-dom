import type { Metadata } from 'next'
import { preload } from 'react-dom'
import { HouseCard } from '@/components/HouseCard'
import { LeadInline } from '@/components/LeadForm'
import { MortgageCalc } from '@/components/MortgageCalc'
import { CountUp, HeroAura } from '@/components/Motion'
import { Regions, type RegionStats } from '@/components/Regions'
import { Words } from '@/components/Words'
import { getCompany, getEstates, getHouses, getProjects, getRegions, img, srcSet } from '@/lib/data'
import { formatMillions, plural } from '@/lib/format'
import { mainHref } from '@/lib/site'
import { estateView, houseView, regionView } from '@/lib/view'

export const revalidate = 60 // statuses and prices change in the admin; the page refreshes within a minute

export const metadata: Metadata = { alternates: { canonical: '/' } }

export default async function Home() {
  const [company, regions, estates, houses, projects] = await Promise.all([getCompany(), getRegions(), getEstates(), getHouses(), getProjects()])
  const views = regions.map(regionView)
  const free = houses.filter((h) => h.status === 'free').map(houseView)
  const years = company.since ? new Date().getFullYear() - company.since : null
  const estateViews = estates.map((e) => estateView(e, houses))
  const stats: Record<string, RegionStats> = {}
  for (const r of views) {
    const mine = estateViews.filter((e) => e.regionSlug === r.slug)
    const prices = mine.map((e) => e.priceFrom).filter((p): p is number => p !== null)
    stats[r.slug] = {
      estates: mine.length,
      free: mine.reduce((s, e) => s + e.free, 0),
      priceFrom: prices.length ? Math.min(...prices) : null,
      cover: mine[0]?.coverCard,
    }
  }
  const hero = company.heroPhoto
  const heroSrc = img(hero, 'wide')
  if (heroSrc) preload(heroSrc, { as: 'image', fetchPriority: 'high', imageSrcSet: srcSet(hero), imageSizes: '(min-width: 960px) 1600px, 660px' })

  return (
    <>
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
            Строим и продаём капитальные кирпичные дома с участком: готовые — в наших посёлках, под заказ — по {projects.length} проверенным
            проектам. Ипотека и регистрация за 2 недели, гарантия 5 лет.
          </p>
          <div className="btns">
            <a href="#regions" className="btn btn--gold">
              Выбрать регион
            </a>
            <a href={mainHref('/catalog')} className="btn btn--ghost">
              Готовые дома{free.length ? ` · ${free.length}` : ''}
            </a>
          </div>
          <div className="hero2__stats">
            {years && (
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
            <img src={heroSrc} srcSet={srcSet(hero)} sizes="(min-width: 960px) 1600px, 660px" alt={typeof hero === 'object' ? hero?.alt ?? '' : ''} fetchPriority="high" decoding="async" />
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

      <section className="section" id="services">
        <div className="container">
          <div className="head" data-reveal>
            <span className="idx">01 / Что мы делаем</span>
            <Words text="Купить готовый или *построить* — с одной командой" />
          </div>
          <div className="services">
            <a href={mainHref('/catalog')} className="service" data-reveal>
              <span className="service__num">01</span>
              <h3>Купить готовый дом</h3>
              <p>Кирпичные дома с предчистовой отделкой, участком и подключёнными коммуникациями. Можно заезжать после сделки.</p>
              <span className="service__go">
                {free.length} {plural(free.length, 'дом', 'дома', 'домов')} в продаже →
              </span>
            </a>
            <a href={mainHref('/build')} className="service" data-reveal style={{ ['--d' as string]: '80ms' }}>
              <span className="service__num">02</span>
              <h3>Построить дом</h3>
              <p>
                {projects.length} проверенных проектов от {Math.min(...projects.map((p) => p.area || 999))} м². Капитальный дом под ключ за 6 месяцев.
              </p>
              <span className="service__go">Выбрать проект →</span>
            </a>
            <a href={mainHref('/mortgage')} className="service" data-reveal style={{ ['--d' as string]: '160ms' }}>
              <span className="service__num">03</span>
              <h3>Подобрать ипотеку</h3>
              <p>{(company.mortgage || []).map((m) => m.title).join(', ') || 'Ипотека'}. Поможем с банком и документами.</p>
              <span className="service__go">Рассчитать платёж →</span>
            </a>
          </div>
        </div>
      </section>

      <section className="section section--paper" id="regions">
        <div className="container">
          <div className="head head--split">
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">02 / Где мы строим</span>
              <Words text="Выберите *регион*" />
            </div>
            <p className="lead" data-reveal>
              В каждом регионе — свои посёлки, цены и офис продаж. Новые регионы открываем с листа ожидания: запишитесь, и мы сообщим первыми.
            </p>
          </div>
          <Regions regions={views} stats={stats} />
        </div>
      </section>

      <section className="section">
        <div className="container family">
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">03 / Почему «хороший»</span>
              <Words text="Дом, в котором растут дети и собирается *семья*" />
              <p className="lead">
                Мы строим не квадратные метры, а место, куда хочется возвращаться: свой двор вместо подъезда, тишина вместо трассы, школа
                рядом вместо пробок.
              </p>
            </div>
            <div className="values">
              {(company.values || []).map((v, i) => (
                <div key={v.id ?? v.title} className="value" data-reveal style={{ ['--d' as string]: `${i * 80}ms` }}>
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
            {years && (
              <div data-reveal>
                <b>
                  <CountUp to={years} />
                </b>
                <span>лет строим дома</span>
              </div>
            )}
            <div data-reveal style={{ ['--d' as string]: '80ms' }}>
              <b>
                <CountUp to={company.homesBuilt || estates.reduce((s, e) => s + (e.homes || 0), 0)} />
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
      <section className="section section--paper">
        <div className="container">
          <div className="head" data-reveal>
            <span className="idx">Почему нам доверяют</span>
            <Words text="Недорогой дом может выглядеть как *особняк*" />
          </div>
          <div className="features">
            {(company.advantages || []).map((a, i) => (
              <div key={a.id ?? a.title} className="feature" data-reveal style={{ ['--d' as string]: `${(i % 3) * 80}ms` }}>
                <span className="feature__num">0{i + 1}</span>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="head head--split">
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">04 / В продаже сейчас</span>
              <Words text="Свободные *дома*" />
            </div>
            <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }} data-reveal>
              <p className="lead">
                {free.length} из {houses.length} домов текущих очередей свободны, от {free.length ? formatMillions(Math.min(...free.map((h) => h.price))) : '—'}.
              </p>
              <a href={mainHref('/catalog')} className="btn btn--green">
                Все дома с фильтрами
              </a>
            </div>
          </div>
          <div className="grid grid--3">
            {free.slice(0, 6).map((h, i) => (
              <div key={h.code} data-reveal style={{ ['--d' as string]: `${(i % 3) * 80}ms` }}>
                <HouseCard h={h} />
              </div>
            ))}
          </div>
          <LeadInline
            title="Не знаете, что выбрать?"
            text="Расскажите о семье и бюджете — подберём 2–3 дома или проект и пришлём подборку."
            cta="Подобрать дом"
            target={{ context: 'Главная: подбор', phone: company.phone }}
          />
        </div>
      </section>

      <section className="section section--paper">
        <div className="container">
          <div className="head head--split">
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">05 / Ипотека</span>
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
            <span className="idx">06 / Вопросы</span>
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
