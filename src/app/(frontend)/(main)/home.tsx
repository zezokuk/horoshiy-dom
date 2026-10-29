import { HomeV2 } from './home-v2'
import { HeroDepth } from '@/components/heroes/HeroDepth'
import { HeroDraft } from '@/components/heroes/HeroDraft'
import { HeroHandshake } from '@/components/heroes/HeroHandshake'
import { HeroGenplan } from '@/components/heroes/HeroGenplan'
import { HeroMinimal } from '@/components/heroes/HeroMinimal'
import { Thread } from '@/components/Thread'
import { effectOn } from '@/lib/look'
import type { HeroFacts } from '@/components/heroes/facts'
import { MortgageCalc } from '@/components/MortgageCalc'
import { CountUp } from '@/components/Motion'
import { Pic } from '@/components/Pic'
import { HomeWays, type HomeWay } from '@/components/HomeWays'
import { PlacesExplorer } from '@/components/PlacesExplorer'
import { PromoCards } from '@/components/PromoCards'
import { RealHomes } from '@/components/RealHomes'
import { Words } from '@/components/Words'
import {
  getCompany,
  getEstates,
  getHouses,
  getProjects,
  getPromos,
  getDesign,
  getRegions,
  img,
} from '@/lib/data'
import { formatMillions, plural } from '@/lib/format'
import { mainHref } from '@/lib/site'
import { JsonLd, faqLd, organizationLd } from '@/lib/seo'
import {
  byEstateStatus,
  estateView,
  genplanEstate,
  houseView,
  promoView,
} from '@/lib/view'

/** The first screen: the live one, or a variant from the 20.10 references shown at /preview/hero-N for choosing. */
export type HeroKind = 'current' | 'hero-1' | 'hero-2' | 'hero-3' | 'hero-4' | 'hero-5' | 'hero-6'
export const HERO_VARIANTS: Exclude<HeroKind, 'current'>[] = ['hero-1', 'hero-2', 'hero-3', 'hero-4', 'hero-5', 'hero-6']

/**
 * The brand home: the emotional first screen, two visual ways, real houses with prices, then interactive places.
 * Rendered by the home page and by the first-screen previews (/preview/hero-N), so both always show the same data.
 */
export async function HomeView({ hero: variant = 'current' }: { hero?: HeroKind }) {
  const [company, regions, estates, houses, projects, promos, design] = await Promise.all([
    getCompany(),
    getRegions(),
    getEstates(),
    getHouses(),
    getProjects(),
    getPromos(),
    getDesign(),
  ])
  // v2 (29.10): the first screen «hero-6» comes with the new nine-screen home; the old first screens keep this one
  if (variant === 'hero-6') {
    return (
      <>
        <JsonLd data={organizationLd(company, regions)} />
        <HomeV2 company={company} design={design} estates={estates} houses={houses} projects={projects} regions={regions} />
      </>
    )
  }
  const free = houses.filter((h) => h.status === 'free').map(houseView)
  const realHomePhotos = new Set<string>()
  const realHomes = [...free]
    .sort((a, b) => a.price - b.price)
    .filter((h) => {
      if (!h.photo || h.title.startsWith('Тип 12') || realHomePhotos.has(h.photo)) return false
      realHomePhotos.add(h.photo)
      return true
    })
    .slice(0, 3)
  const priceFrom = free.length ? Math.min(...free.map((h) => h.price)) : null
  const years = company.since ? new Date().getFullYear() - company.since : null
  const estateViews = estates.map((e) => estateView(e, houses))
  const built = estateViews.filter((e) => e.status !== 'planned').length // a coming estate is not one of «our estates» yet
  const homesCount = company.homesBuilt || estates.reduce((s, e) => s + (e.homes || 0), 0)
  const active = regions.filter((r) => r.status === 'active')
  const soon = regions.filter((r) => r.status === 'soon')
  const hero = company.heroPhoto
  const heroSrc = img(hero, 'wide')
  // phones: the photo sits below the first screen, so it gets the 640 px copy (≈50 KB, not 314) and no preload
  // that would take the network from fonts and scripts (measured with tools/perfcheck.py, 19.10)
  const heroPhone = img(hero, 'card')

  const heroType = (company.heroCaption || '').match(/Тип \d+/)?.[0]
  const buyHouse =
    free.find((h) => h.photo && !h.title.startsWith('Тип 12') && h.title.split(' (')[0] !== heroType) ??
    free.find((h) => h.photo && !h.title.startsWith('Тип 12'))
  const buildProject =
    projects.find(
      (p) =>
        p.storeys === 2 &&
        p.plan &&
        p.name !== heroType &&
        p.name !== buyHouse?.title.split(' (')[0],
    ) ??
    projects.find(
      (p) =>
        p.plan &&
        p.name !== 'Тип 12' &&
        p.name !== heroType &&
        p.name !== buyHouse?.title.split(' (')[0],
    ) ?? projects.find((p) => p.plan && p.name !== 'Тип 12')

  const ways: HomeWay[] = [
    {
      n: '01',
      href: mainHref('/catalog'),
      kind: 'photo',
      photo: buyHouse?.photo,
      alt: buyHouse ? `Дом «${buyHouse.title}» в посёлке «${buyHouse.estateName}»` : '',
      kicker: 'Готовые дома',
      title: 'Посмотреть',
      accent: 'свободные дома',
      text: 'Цена, планировка, комплектация и расчёт ипотеки — до того, как вы запишетесь на показ.',
      go: 'Выбрать дом',
      meta: free.length
        ? `${free.length} ${plural(free.length, 'дом', 'дома', 'домов')}${priceFrom ? ` · от ${formatMillions(priceFrom)}` : ''}`
        : 'Каталог домов',
    },
    {
      n: '02',
      href: mainHref('/build'),
      kind: 'plan',
      plan: buildProject?.slug === 'tip-9' ? '/design/plan-tip9-lines.webp' : img(buildProject?.plan, 'wide'),
      planNote: buildProject
        ? `Проект «${buildProject.name}»${buildProject.area ? ` · ${buildProject.area.toLocaleString('ru-RU')} м²` : ''}`
        : 'Архитектурный проект',
      alt: buildProject ? `Планировка дома по проекту «${buildProject.name}»` : 'Архитектурная схема строительства',
      kicker: 'Строительство под ключ',
      title: 'Построить',
      accent: 'дом',
      text: 'Выберите проект и посмотрите, как мы строим: от плана и фундамента до кирпича и кровли.',
      go: 'Как мы строим',
      meta: `${projects.length} ${plural(projects.length, 'проект', 'проекта', 'проектов')}`,
    },
  ]

  const placeViews = byEstateStatus(estateViews).map((e) => {
    const real = free.find((h) => h.estateSlug === e.slug && h.photo && !h.title.startsWith('Тип 12'))
    return {
      ...e,
      photo: real?.photo ?? e.cover,
      photoCard: real?.photoCard ?? e.coverCard,
    }
  })

  // one set of numbers for every first-screen variant: all from the admin, nothing typed into the design
  const facts: HeroFacts = {
    since: company.since ?? null,
    years,
    homes: homesCount,
    homesLabel: company.homesBuilt
      ? plural(homesCount, 'дом построен', 'дома построено', 'домов построено')
      : `${plural(homesCount, 'дом', 'дома', 'домов')} в наших посёлках`,
    selling: byEstateStatus(estateViews)
      .filter((e) => e.status !== 'planned' && e.free > 0)
      .map((e) => ({ name: e.name, href: e.href, free: e.free })),
    free: free.length,
    priceFrom,
    projects: projects.length,
    regionsLine: [
      active.length ? active.map((r) => r.name).join(', ') : '',
      soon.length ? `скоро — ${soon.map((r) => r.name).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join(', '),
  }

  // variant 2: the 3D plan of the estate with the most free houses (as the region page's showcase)
  const showcase =
    variant === 'hero-2'
      ? [...estates].sort(
          (a, b) =>
            (estateViews.find((v) => v.slug === b.slug)?.free ?? 0) -
            (estateViews.find((v) => v.slug === a.slug)?.free ?? 0),
        )[0]
      : null
  const showcaseHouses = showcase
    ? houses
        .filter((h) => (typeof h.estate === 'object' ? h.estate?.id : h.estate) === showcase.id)
        .map(houseView)
    : []

  const faq = faqLd(company.faq)
  return (
    <>
      <JsonLd data={organizationLd(company, regions)} />
      {faq && <JsonLd data={faq} />}
      {variant === 'hero-5' ? (
        <HeroHandshake f={facts} place={active.map((r) => r.name).join(', ')} />
      ) : variant === 'hero-4' ? (
        <HeroDraft f={facts} />
      ) : variant === 'hero-1' ? (
        <HeroDepth f={facts} />
      ) : variant === 'hero-2' && showcase ? (
        <HeroGenplan
          f={facts}
          estate={genplanEstate(showcase, showcaseHouses.length)}
          houses={showcaseHouses}
          current={showcase.name}
        />
      ) : variant === 'hero-3' ? (
        <HeroMinimal
          f={facts}
          slogan={company.slogan}
          photo={
            heroSrc
              ? {
                  src: heroSrc,
                  phone: heroPhone,
                  alt: typeof hero === 'object' ? (hero?.alt ?? '') : '',
                  caption: company.heroCaption,
                }
              : undefined
          }
        />
      ) : (
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
                <b>{built}</b>
                <span>{plural(built, 'посёлок', 'посёлка', 'посёлков')}</span>
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
              <Pic
                src={heroSrc}
                phone={heroPhone}
                alt={typeof hero === 'object' ? (hero?.alt ?? '') : ''}
                priority
              />
            )}
            <div className="hero2__chips">
              <span>Готовые дома</span>
              <span>Стройка под ключ</span>
              <span>Гарантия 5 лет</span>
            </div>
            {company.heroCaption && (
              <span className="hero2__caption">
                {company.heroCaption} · {(company.slogan || '').toLowerCase()}
              </span>
            )}
          </div>
        </section>
      )}

      <HomeWays ways={ways} />

      <Thread off={!effectOn(design, 'thread')}>
        {realHomes.length > 0 && <RealHomes houses={realHomes} />}

        <PlacesExplorer estates={placeViews} />

        <section className="section section--paper">
          <div className="container family">
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ display: 'grid', gap: 14 }} data-reveal>
                <span className="idx">Почему «хороший»</span>
                <Words text="Дом, в котором растут дети и собирается *семья*" />
                {/* facts, not slogans (19.10): all from the client's materials — the FAQ, the estates and the values.
                    Gas: the client writes «возможность подключить газ», never «подключён» (23.10) */}
                <p className="lead">
                  Свой участок с замощённым двором и парковкой на 2 машины, вода и 15 кВт в доме,
                  газ можно подключить. В Козете и Новой Адыгее до школы — 2–5 минут.
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
                  <CountUp to={homesCount} />
                </b>
                {/* «71 дом», not «71 домов» */}
                <span>
                  {company.homesBuilt
                    ? plural(homesCount, 'дом построен', 'дома построено', 'домов построено')
                    : `${plural(homesCount, 'дом', 'дома', 'домов')} в наших посёлках`}
                </span>
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
              <p className="lead">Не нашли ответ — позвоните или оставьте заявку, менеджер всё расскажет.</p>
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
      </Thread>
    </>
  )
}
