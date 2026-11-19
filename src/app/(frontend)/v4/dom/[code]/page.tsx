import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LeadForm } from '@/components/LeadForm'
import { PlanRender } from '@/components/PlanRender'
import { getCompany, getHouse, getHouses, img, plural } from '@/lib/data'
import { STATUS_LABEL, annuity, formatArea, formatMillions } from '@/lib/format'
import { JsonLd, breadcrumbsLd, houseLd } from '@/lib/seo'
import { mainHref } from '@/lib/site'
import { houseView, roomsView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { House3DStage } from '@/v4/House3DStage'
import { Mortgage } from '@/v4/Mortgage'
import { V4Bar, V4Footer, V4Fonts, telOf } from '@/v4/Shell'
import { SunOnPlot } from '@/v4/SunOnPlot'
import { v4img } from '@/v4/images'
import type { Estate, Project, Region } from '@/payload-types'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 · полная страница дома (по Figma 278-1609 и 278-1430):
 *  - Верх: 3D-модель (день / вечер с окнами / ночь с луной) + 360° тур + «снять крышу»
 *  - Под сценой слева: «Солнце на участке» + карточка ежемесячного платежа
 *  - Справа: статус, цена, доступность в посёлках, сетка 2×2 «Солнце / Что рядом / Внутри / Что входит в цену», «Этот тип ещё на участках…»
 *  - Ниже: Планировка («3D-вид / Чертёж» с подписями комнат), форма «Свяжитесь со мной» + «Частые вопросы»,
 *    полный ипотечный калькулятор, фильтры поиска («Все дома этого типа» / «Все дома в посёлке») + похожие дома.
 */
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ code: string }> }

const INCLUDED = ['Разводка электричества и отопления', 'Электрический котёл', 'Штукатурка стен по маякам', 'Ворота: откатные или распашные', 'Отмостка и паркоместо из плитки', 'Скважина', '15 кВт на дом', 'Газ по меже участка', 'Септик до 9 м³']

async function load(params: Props['params']) {
  const { code } = await params
  const house = await getHouse(code)
  if (!house) return null
  const estate = house.estate as Estate | undefined
  return estate ? { house, estate, region: estate.region as Region | undefined } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params)
  if (!d) return {}
  const h = houseView(d.house)
  return {
    title: { absolute: `${h.title}, ${formatArea(h.area)} м², посёлок «${d.estate.name}» — ${formatMillions(h.price)} · Хороший дом` },
    description: `Кирпичный дом ${formatArea(h.area)} м²${h.plot ? `, участок ${h.plot}` : ''}, ${d.estate.place}. ${STATUS_LABEL[h.status]}. Предчистовая отделка, ипотека, показ вживую.`,
    robots: { index: false, follow: false },
    alternates: { canonical: h.href },
  }
}

export default async function V4House({ params }: Props) {
  const d = await load(params)
  if (!d) notFound()
  const { house, estate: e, region } = d
  const h = houseView(house)
  const project = typeof house.project === 'object' ? (house.project as Project | null) : null
  const [company, allFree] = await Promise.all([getCompany(), getHouses({ status: 'free' })])

  const mediaId = (m: unknown) => (m && typeof m === 'object' ? (m as { id?: unknown }).id : m)
  const samePlan = !house.plan || mediaId(house.plan) === mediaId(project?.plan)
  const render = samePlan ? ((project?.slug === 'tip-5' ? v4img('П1')?.src : undefined) ?? img(project?.render, 'wide')) : undefined
  const rooms = render ? roomsView(project) : []
  const photo = h.photo ?? img(project?.photo, 'wide')
  const rough = h.features.includes('Черновая отделка')

  const allFreeViews = allFree.map(houseView)
  const sameTypeInEstate = allFreeViews.filter(
    (x) => x.code !== h.code && x.estateSlug === e.slug && project && x.title.startsWith(project.name),
  )
  const sameTypeEstates = allFreeViews
    .filter((x) => project && x.title.startsWith(project.name))
    .map((x) => ({ name: x.estateName, slug: x.estateSlug }))
  const uniqueEstates = sameTypeEstates.filter((v, idx, arr) => arr.findIndex((t) => t.slug === v.slug) === idx)

  const similar = allFreeViews
    .filter((x) => x.code !== h.code)
    .sort((a, b) => Math.abs(a.price - h.price) - Math.abs(b.price - h.price))
    .slice(0, 4)

  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }
  const share = h.price ? Math.max(fam.minDown, Math.ceil(((h.price - fam.limit) / h.price) * 100)) : fam.minDown
  const pay = h.price ? annuity(h.price * (1 - share / 100), fam.rate, fam.years) : 0
  const tel = telOf(company.phone)
  const faq = (company.faq ?? []).slice(0, 6)
  const nearbyList = (e.nearby ?? []).slice(0, 3)

  return (
    <div className="v3 v4 v4-house">
      <V4Fonts />
      <JsonLd data={houseLd(h, e, region ?? ({} as Region), company.legalName || company.name)} />
      <JsonLd data={breadcrumbsLd([{ name: 'Главная', url: mainHref('/') }, { name: e.name, url: h.href.replace(/\/houses\/.*/, `/objects/${e.slug}`) }, { name: h.title, url: h.href }])} />
      <V4Bar phone={company.phone} always />

      <MotionRoot smooth={false}>
        <section className="v4-dom-hero">
          <span className="v4-ghost" aria-hidden>{(project?.name ?? 'дом').toLowerCase()}</span>
          <div className="v3-wrap">
            <nav className="v4-dom__crumbs" aria-label="Навигация">
              <a href="/v4">Главная</a>
              <span aria-hidden>/</span>
              <a href={`/v4/poselok/${e.slug}`}>{e.name}</a>
              {project && (
                <>
                  <span aria-hidden>/</span>
                  <a href={`/v4/proekt/${project.slug}`}>{project.name}</a>
                </>
              )}
            </nav>

            <div className="v4-dom-grid">
              {/* Левая колонка: 3D/360°/Фото сцена + Солнце + Платёж в месяц */}
              <div className="v4-dom-grid__left" id="stage3d">
                <House3DStage
                  title={h.title}
                  photo={photo}
                  hasPlanRender={Boolean(render || h.plan)}
                  isType5={project?.slug === 'tip-5'}
                />

                <div className="v4-dom-widgets">
                  <SunOnPlot axisDeg={e.slug === 'dinskaya' ? 80 : 90} />
                  <div className="v4-dom-paycard">
                    <p className="v4-dom-paycard__lbl">Платёж в месяц, примерно</p>
                    <p className="v4-dom-paycard__val">{pay.toLocaleString('ru-RU')} ₽</p>
                    <p className="v4-dom-paycard__meta">
                      Семейная ипотека {fam.rate} % · {fam.years} лет · первый взнос от {share} %.{' '}
                      <a href="#ipoteka">Рассчитать точно ↓</a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Правая колонка: Название, цена, кнопки, сетка 2×2 «инфо ui», похожие участки */}
              <div className="v4-dom-grid__right">
                <p className={`v3-status v4-dom__status v4-dom__status--${h.status}`}><i />{STATUS_LABEL[h.status]}</p>
                <h1 className="v4-dom-h1">{h.title}</h1>
                <p className="v4-dom__where">
                  {formatArea(h.area)} м²{h.mansard ? ` + ${formatArea(h.mansard)} м² мансарда` : ''}
                  {h.plot ? ` · участок ${h.plot}` : ''} · посёлок <a href={`/v4/poselok/${e.slug}`}>«{e.name}»</a>
                </p>

                <p className="v4-price v4-dom__price">{formatMillions(h.price)}</p>
                <p className="v3-note">
                  {rough ? 'В черновой отделке.' : 'В предчистовой отделке, коммуникации на участке.'} Бронь — 100 000 ₽.
                </p>

                {uniqueEstates.length > 0 && (
                  <div className="v4-dom-estates">
                    <span>Доступен к покупке в посёлках:</span>
                    <div>
                      {uniqueEstates.map((ue) => (
                        <a key={ue.slug} href={`/v4/poselok/${ue.slug}`} className={ue.slug === e.slug ? 'is-on' : ''}>
                          {ue.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="v3-row v4-dom__cta">
                  <a className="v3-btn v3-btn--main" href="#evf-form">Записаться на показ</a>
                  {tel && <a className="v3-btn v4-btn--line" href={`tel:${tel}`}>{company.phone}</a>}
                </div>

                {/* 4 инфо-карточки (вместо «инфо ui» из Figma 278-1430) */}
                <div className="v4-dom-info2x2">
                  <div className="v4-dom-icard">
                    <b>Солнце на участке</b>
                    <p>Утром свет со стороны крыльца и кухни, после обеда — на террасе и во дворе. Двигайте бегунок времени слева.</p>
                  </div>
                  <div className="v4-dom-icard">
                    <b>Что рядом</b>
                    <p>
                      {nearbyList.length
                        ? nearbyList.map((n) => `${n.label} — ${n.value}`).join(' · ')
                        : `${e.place} · спокойная улица без сквозного трафика`}
                    </p>
                  </div>
                  <a href="#plan" className="v4-dom-icard v4-dom-icard--link">
                    <b>Внутри дома →</b>
                    <p>
                      {[
                        `${formatArea(h.area)} м²`,
                        h.bedrooms ? `${h.bedrooms} ${plural(h.bedrooms, 'спальня', 'спальни', 'спален')}` : null,
                        h.bathrooms ? `${h.bathrooms} ${plural(h.bathrooms, 'санузел', 'санузла', 'санузлов')}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      . Смотреть планировку и чертёж.
                    </p>
                  </a>
                  <div className="v4-dom-icard">
                    <b>Что входит в цену</b>
                    <p>Предчистовая отделка по маякам, котёл, скважина, септик до 9 м³, 15 кВт, откатные/распашные ворота, паркоместо.</p>
                  </div>
                </div>

                {sameTypeInEstate.length > 0 && (
                  <div className="v4-dom-moreplots">
                    <b>Этот тип ещё в «{e.name}» ({sameTypeInEstate.length})</b>
                    <div className="v4-dom-moreplots__links">
                      {sameTypeInEstate.slice(0, 6).map((x) => (
                        <a key={x.code} href={`/v4/dom/${x.code}`}>
                          {x.plotNo ? `Уч. ${x.plotNo}` : x.title} · {formatMillions(x.price)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Планировка: 3D-вид сверху с мебелью / Чертёж */}
        {(render || h.plan) && (
          <section className="v3-sec v4-sec v4-dom-plansec" id="plan">
            <div className="v3-wrap v4-head">
              <p className="v4-num">Планировка</p>
              <h2 className="v3-h2" data-move="lines">Как устроен <em>дом внутри</em></h2>
              <p className="v3-lead">
                {render
                  ? 'Наведите на комнату — подсветим её площадь. Мебель на виде сверху показана для примера.'
                  : 'Точный поэтажный чертёж с площадями комнат по проекту застройщика.'}
              </p>
            </div>
            <div className="v3-wrap">
              {render ? (
                <PlanRender render={render} plan={h.plan} rooms={rooms} alt={`Планировка «${h.title}»`} />
              ) : (
                <div className="v4-dom-planbox">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="v4-dom__plan" src={h.plan!} alt={`Планировка «${h.title}»`} loading="lazy" />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Что входит в цену подробно */}
        <section className="v3-sec v4-sec">
          <div className="v3-wrap v3-split">
            <div>
              <p className="v4-num">Комплектация</p>
              <h2 className="v3-h2" data-move="lines">Дом готов <em>к отделке</em></h2>
              <p className="v3-lead">{rough ? 'Этот дом продаётся в черновой отделке: стены и коммуникации — по договору.' : 'Электричество и отопление разведены, котёл стоит, стены оштукатурены. Остаётся чистовая отделка — по вашему вкусу.'}</p>
            </div>
            <div className="v3-included">
              <h3>По прайсу застройщика</h3>
              <ul>{INCLUDED.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        </section>

        {/* Свяжитесь со мной + Частые вопросы (в 2 колонки как в Figma 278-1430) */}
        <section className="v3-sec v4-sec v4-dom-contactsec" id="pokaz">
          <div className="v3-wrap v4-dom-two">
            <div id="evf-form">
              <p className="v4-num">Запись на показ</p>
              <h2 className="v3-h2" data-move="lines">Свяжитесь <em>со мной</em></h2>
              <p className="v3-lead" style={{ marginBottom: 20 }}>Покажем «{h.title}» в посёлке «{e.name}» вживую или по видеосвязи. Ответим про участок, ипотеку и документы.</p>
              <div className="v3-final__form">
                <LeadForm light cta="Записаться на показ" target={{ interest: 'buy', house: h.code, estate: e.slug, context: `Дом v4: ${h.title}, ${e.name}`, phone: company.phone }} />
              </div>
            </div>

            <div>
              <p className="v4-num">FAQ</p>
              <h2 className="v3-h2" data-move="lines">Частые <em>вопросы</em></h2>
              <div className="v4-faq">
                {faq.map((f, k) => (
                  <details key={f.q} open={k === 0}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Ипотечный калькулятор */}
        <section className="v3-sec v4-sec v4-sec--mort" id="ipoteka">
          <div className="v3-wrap v4-head">
            <p className="v4-num">Ипотека</p>
            <h2 className="v3-h2" data-move="lines">Ипотека <em>на этот дом</em></h2>
          </div>
          <div className="v3-wrap">
            <Mortgage houses={[{ code: h.code, label: h.title, price: h.price }]} family={fam} />
          </div>
        </section>

        {/* Фильтры поиска и похожие дома (Figma 278-1430) */}
        <section className="v3-sec v4-sec">
          <div className="v3-wrap">
            <div className="v4-dom-filtershead">
              <h2 className="v3-h2" data-move="lines">Ещё дома <em>в продаже</em></h2>
              <div className="v4-dom-filtershead__btns">
                {project && (
                  <a className="v4-pill-btn" href={`/v4/proekt/${project.slug}`}>
                    Смотреть все дома «{project.name}» (во всех посёлках)
                  </a>
                )}
                <a className="v4-pill-btn" href={`/v4/poselok/${e.slug}`}>
                  Смотреть дома в посёлке «{e.name}»
                </a>
              </div>
            </div>

            {similar.length > 0 && (
              <div className="v4-dom__similar">
                {similar.map((s) => (
                  <a key={s.code} className="v3-card" href={`/v4/dom/${s.code}`}>
                    <figure>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {s.photoCard || s.photo ? <img src={s.photoCard ?? s.photo} alt={s.title} loading="lazy" /> : <span className="v3-card__noimg">Фото скоро</span>}
                      <figcaption>Изображение проекта</figcaption>
                    </figure>
                    <div className="v3-card__body">
                      <span className="v3-status"><i />Свободен</span>
                      <h3>{s.title} · {formatArea(s.area)} м²</h3>
                      <p>{s.estateName}{s.plot ? ` · ${s.plot}` : ''}</p>
                      <p className="v3-price">{formatMillions(s.price)}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
