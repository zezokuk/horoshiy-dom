import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PlotPicker } from '@/components/home/PlotPicker'
import { getCompany, getEstate, getHouses, getProjects, img, plural } from '@/lib/data'
import { formatArea, formatMillions } from '@/lib/format'
import { JsonLd, breadcrumbsLd, estateLd } from '@/lib/seo'
import { mainHref } from '@/lib/site'
import { cleanPhotoUrl, estateSale, estateView, genplanEstate, houseView } from '@/lib/view'
import { housePhotography, projectCleanPhoto } from '@/v4/housePhotography'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { HousePicker, type PickHouse } from '@/v3/home/HousePicker'
import { StickyCta } from '@/v3/home/StickyCta'
import { DinskayaGenplan } from '@/v4/DinskayaGenplan'
import { V4Bar, V4Final, V4Fonts, V4Footer } from '@/v4/Shell'
import { v4img } from '@/v4/images'
import type { Region } from '@/payload-types'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 · страница посёлка (без старой обложки со змеем):
 *  1. Шапка посёлка: статус, локация, 4 ключевых факта и быстрые переходы;
 *  2. Всё о посёлке: адрес, минуты до ключевых точек, коммуникации, инфраструктура и особенности;
 *  3. Интерактивный генплан (для Динской — спутниковый 36 участков с ховер-ценами и 3D-переходом);
 *  4. Типы домов в этом посёлке — визуальный список с фото, планировкой, ценами и выбором вариантов;
 *  5. Готовые дома в продаже списком с фильтром по типу + вечерний финал.
 */
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const e = await getEstate(slug)
  if (!e) return {}
  const houses = await getHouses({ estate: e.id })
  const v = estateView(e, houses)
  return {
    title: { absolute: `Дома в посёлке «${e.name}», ${e.place ?? ''}${v.priceFrom ? ` — от ${formatMillions(v.priceFrom)}` : ''} · Хороший дом` },
    description: `${e.kind || 'Посёлок'} «${e.name}»: ${estateSale(v).toLowerCase()}. ${e.tagline ?? ''}`.trim(),
    robots: { index: false, follow: false },
    alternates: { canonical: v.href },
  }
}

export default async function V4Estate({ params }: Props) {
  const { slug } = await params
  const e = await getEstate(slug)
  if (!e) notFound()
  const [company, houses, projects] = await Promise.all([getCompany(), getHouses({ estate: e.id }), getProjects()])
  const region = (typeof e.region === 'object' ? e.region : undefined) as Region | undefined
  const v = estateView(e, houses)
  const all = houses.map(houseView)
  const free = all.filter((h) => h.status === 'free').sort((a, b) => a.price - b.price)
  const rawByCode = new Map(houses.map((x) => [x.code, x]))
  const pick: PickHouse[] = free.map((h) => {
    const raw = rawByCode.get(h.code)
    const pid = raw ? (typeof raw.project === 'object' ? raw.project?.id : raw.project) : undefined
    const pslug = projects.find((p) => p.id === pid)?.slug
    const frames = housePhotography(h.code, pslug)
    return {
      code: h.code,
      title: h.title,
      area: h.area,
      plot: h.plot,
      price: h.price,
      estate: h.estateName,
      photo: frames[0]?.src ?? h.photoCard ?? h.photo,
      href: `/v4/dom/${h.code}`,
      caption: frames[0]?.caption ?? 'Изображение проекта',
    }
  })
  const plot = free.length && e.status !== 'planned' ? [{ name: e.name, href: v.href, estate: genplanEstate(e, all.length), houses: all }] : []
  const showGenplan = e.slug === 'dinskaya' || free.length > 1
  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }
  const map = e.lat && e.lng ? `https://yandex.ru/maps/?pt=${e.lng},${e.lat}&z=15&l=map` : null

  const projectIdOf = (h: (typeof houses)[number]) => (typeof h.project === 'object' ? h.project?.id : h.project)
  const estateTypes = projects
    .map((p) => {
      const exactNum = p.name.match(/\d+/)?.[0]
      const nameRx = exactNum ? new RegExp(`тип\\s*${exactNum}(?!\\d)`, 'i') : null
      const mineAll = houses.filter((h) => projectIdOf(h) === p.id || (nameRx ? nameRx.test(h.title) : false))
      if (mineAll.length === 0) return null
      const mineFree = mineAll.filter((h) => h.status === 'free').sort((a, b) => a.price - b.price)
      const sampleRaw = mineFree[0] ?? mineAll[0]
      const sample = houseView(sampleRaw)
      const prices = mineFree.map((h) => h.price ?? 0).filter((x) => x > 0)
      const plotSizes = (mineFree.length ? mineFree : mineAll)
        .map((h) => Number.parseFloat((h.plot ?? '').replace(',', '.')))
        .filter((x) => Number.isFinite(x) && x > 0)
      return {
        slug: p.slug,
        num: exactNum ? Number(exactNum) : 99,
        name: p.name,
        photo: projectCleanPhoto(p.slug) ?? cleanPhotoUrl(img(p.photo, 'wide')) ?? sample.photo ?? sample.photoCard,
        plan: img(p.plan, 'wide') ?? sample.plan,
        area: p.area ?? sample.area ?? null,
        mansard: p.mansard ?? sample.mansard ?? null,
        storeys: p.storeys ?? (sample.storeys === 2 ? 2 : 1),
        bedrooms: p.bedrooms ?? sample.bedrooms ?? null,
        totalInEstate: mineAll.length,
        freeInEstate: mineFree.length,
        minPrice: prices.length ? Math.min(...prices) : null,
        minPlot: plotSizes.length ? Math.min(...plotSizes) : null,
        firstFreeHref: mineFree[0] ? `/v4/dom/${mineFree[0].code}` : null,
        projectHref: `/v4/proekt/${p.slug}`,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.num - b.num)

  const facts = [
    e.homes ? { v: String(e.homes), l: plural(e.homes, 'участок в посёлке', 'участка в посёлке', 'участков в посёлке') } : null,
    { v: String(free.length), l: `${plural(free.length, 'дом', 'дома', 'домов')} в продаже` },
    v.priceFrom ? { v: formatMillions(v.priceFrom), l: 'стоимость дома с участком от' } : null,
    estateTypes.length > 0
      ? { v: String(estateTypes.length), l: plural(estateTypes.length, 'тип дома в посёлке', 'типа домов в посёлке', 'типов домов в посёлке') }
      : (e.nearby ?? [])[0]
        ? { v: e.nearby![0].value, l: `до ${e.nearby![0].label}` }
        : null,
  ].filter((f): f is { v: string; l: string } => f !== null)

  const hasGenplan = showGenplan && (e.slug === 'dinskaya' || plot.length > 0)
  const hasInfo = (e.nearby ?? []).length > 0 || (e.utilities ?? []).length > 0 || (e.infrastructure ?? []).length > 0 || (e.extras ?? []).length > 0 || Boolean(e.address)
  const engineeringItems = [...(e.utilities ?? []), ...(e.infrastructure ?? []), ...(e.extras ?? [])]

  return (
    <div className="v3 v4 v4-house">
      <V4Fonts />
      {region && <JsonLd data={estateLd(e, region, free)} />}
      <JsonLd data={breadcrumbsLd([{ name: 'Главная', url: mainHref('/') }, { name: e.name, url: v.href }])} />
      <V4Bar phone={company.phone} always />
      <MotionRoot>
        {/* 1. Для Динской — ультракомпактная верхняя полоса + СРАЗУ полноэкранный интерактивный генплан (картинка-хук → потом текст) */}
        {e.slug === 'dinskaya' ? (
          <>
            <section className="v4-estate-hero v4-estate-hero--compact">
              <div className="v3-wrap">
                <nav className="v4-dom__crumbs" aria-label="Навигация">
                  <a href="/v4">Главная</a>
                  <span aria-hidden>/</span>
                  <a href="/v4/poselki">Посёлки</a>
                  <span aria-hidden>/</span>
                  <span>{e.name}</span>
                </nav>
                <div className="v4-estate-compact-row">
                  <div className="v4-estate-compact-title">
                    <h1 className="v4-dom-h1">{e.name}</h1>
                    <span className="v3-status">
                      <i />
                      {free.length} в продаже{v.priceFrom ? ` · от ${formatMillions(v.priceFrom)}` : ''}
                    </span>
                  </div>
                  <div className="v4-estate-compact-links">
                    <a className="v4-pik-btn" href="#o-poselke">
                      <span>О посёлке</span>
                    </a>
                    <a className="v4-pik-btn" href="#tipy-poselka">
                      <span>Типы домов ({estateTypes.length})</span>
                    </a>
                    {map && (
                      <a className="v4-pik-btn v4-pik-btn--map" href={map} target="_blank" rel="noreferrer">
                        <span>Яндекс Карты</span>
                        <i className="v4-pik-mapdot" aria-hidden />
                      </a>
                    )}
                    <a className="v4-pik-btn v4-pik-btn--accent" href="#evf-form">
                      <span>Записаться на показ</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <section className="v3-sec v3-sec--mist v4-sec v4-estate-genplan v4-estate-genplan--first" id="genplan">
              <div className="v3-wrap">
                <DinskayaGenplan houses={all} family={fam} infrastructure={e.infrastructure ?? []} nearby={e.nearby ?? []} hideEstateLink />
              </div>
            </section>

            <section className="v3-sec v4-sec v4-estate-about--below">
              <div className="v3-wrap">
                <div className="v4-estate-top">
                  <div className="v4-estate-top__text">
                    <p className="v4-num"><b>01</b> / Паспорт посёлка</p>
                    <h2 className="v3-h2" data-move="lines">Посёлок <em>«{e.name}»</em></h2>
                    <p className="v4-dom__where">
                      {[e.kind || 'Коттеджный посёлок', e.place].filter(Boolean).join(' · ')}
                      {e.tagline ? ` — ${e.tagline}` : ''}
                    </p>
                    {e.description && <p className="v4-estate-desc">{e.description}</p>}
                  </div>
                </div>
                <div className="v4-estate-facts">
                  {facts.map((f) => (
                    <div className="v4-estate-fact" key={f.l}>
                      <b>{f.v}</b>
                      <span>{f.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Для остальных посёлков — шапка + (если есть больше 1 дома) генплан */}
            <section className="v4-estate-hero">
              <span className="v4-ghost" aria-hidden>{e.name.toLowerCase()}</span>
              <div className="v3-wrap">
                <nav className="v4-dom__crumbs" aria-label="Навигация">
                  <a href="/v4">Главная</a>
                  <span aria-hidden>/</span>
                  <a href="/v4/poselki">Посёлки</a>
                  <span aria-hidden>/</span>
                  <span>{e.name}</span>
                </nav>

                <div className="v4-estate-top">
                  <div className="v4-estate-top__text">
                    <span className={`v3-status${e.status !== 'selling' ? ' v3-status--off' : ''}`}>
                      <i />
                      {estateSale(v)}
                    </span>
                    <h1 className="v4-dom-h1">{e.name}</h1>
                    <p className="v4-dom__where">
                      {[e.kind || 'Коттеджный посёлок', e.place].filter(Boolean).join(' · ')}
                      {e.tagline ? ` — ${e.tagline}` : ''}
                    </p>
                    {e.description && <p className="v4-estate-desc">{e.description}</p>}
                  </div>

                  <div className="v4-pik-bar">
                    {hasGenplan ? (
                      <a className="v4-pik-btn v4-pik-btn--accent" href="#genplan">
                        <span>Генплан посёлка ↓</span>
                      </a>
                    ) : free.length === 1 ? (
                      <a className="v4-pik-btn v4-pik-btn--accent" href="#tipy-poselka">
                        <span>Готовый дом в продаже →</span>
                      </a>
                    ) : null}
                    {hasInfo && (
                      <a className="v4-pik-btn" href="#o-poselke">
                        <span>О посёлке</span>
                      </a>
                    )}
                    {estateTypes.length > 0 && (
                      <a className="v4-pik-btn" href="#tipy-poselka">
                        <span>{free.length === 1 ? 'Проект и планировка' : `Типы домов (${estateTypes.length})`}</span>
                      </a>
                    )}
                    {free.length > 1 && (
                      <a className="v4-pik-btn" href="#doma">
                        <span>Дома списком ({free.length})</span>
                      </a>
                    )}
                    {map && (
                      <a className="v4-pik-btn v4-pik-btn--map" href={map} target="_blank" rel="noreferrer">
                        <span>Яндекс Карты</span>
                        <i className="v4-pik-mapdot" aria-hidden />
                      </a>
                    )}
                    <a className="v4-pik-btn" href="#evf-form">
                      <span>Записаться на показ</span>
                    </a>
                  </div>
                </div>

                <div className="v4-estate-facts">
                  {facts.map((f) => (
                    <div className="v4-estate-fact" key={f.l}>
                      <b>{f.v}</b>
                      <span>{f.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {hasGenplan && (
              <section className="v3-sec v3-sec--mist v4-sec v4-estate-genplan" id="genplan">
                <span className="v4-ghost" aria-hidden>генплан</span>
                <div className="v3-wrap v4-head" style={{ marginBottom: 20 }}>
                  <p className="v4-num"><b>01</b> / Генплан</p>
                  <h2 className="v3-h2" data-move="lines">Генплан посёлка <em>«{e.name}»</em></h2>
                  <p className="v3-lead" data-move="up">
                    Наведите на участок, чтобы увидеть площадь и стоимость, или нажмите, чтобы открыть дом.
                  </p>
                </div>
                <div className="v3-wrap">
                  <PlotPicker estates={plot} />
                </div>
              </section>
            )}
          </>
        )}

        {/* 3. Всё о посёлке: окружение, минуты и коммуникации */}
        {hasInfo && (
          <section className="v3-sec v4-sec v4-estate-about" id="o-poselke">
            <div className="v3-wrap v4-head" style={{ marginBottom: 20 }}>
              <p className="v4-num"><b>{hasGenplan ? '02' : '01'}</b> / О посёлке</p>
              <h2 className="v3-h2" data-move="lines">Всё о <em>посёлке</em></h2>
            </div>
            <div className="v3-wrap v4-estate-info">
              {((e.nearby ?? []).length > 0 || e.address || map) && (
                <div className="v4-estate-box" data-move="up">
                  <p className="v4-num">Локация и окружение</p>
                  <h3>Что рядом в минутах</h3>
                  {e.address && <p className="v4-estate-addr">{[e.address, e.district].filter(Boolean).join(' · ')}</p>}
                  {(e.nearby ?? []).length > 0 && (
                    <ul className="v4-near">
                      {e.nearby!.map((n) => (
                        <li key={n.label}>
                          <span>{n.label}</span>
                          <b>{n.value}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                  {map && (
                    <a className="v4-types__all" href={map} target="_blank" rel="noreferrer" style={{ marginTop: 14 }}>
                      Открыть точку на Яндекс Картах →
                    </a>
                  )}
                </div>
              )}

              {engineeringItems.length > 0 && (
                <div className="v4-estate-box" data-move="up">
                  <p className="v4-num">Инженерия и среда</p>
                  <h3>Коммуникации и благоустройство</h3>
                  <ul className="v4-chips-list">
                    {engineeringItems.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. Типы домов в этом посёлке — визуальный список с фото, планировкой и выбором */}
        {estateTypes.length > 0 && (
          <section className="v3-sec v3-sec--linen v4-sec" id="tipy-poselka">
            <span className="v4-ghost" aria-hidden>типы домов</span>
            <div className="v3-wrap v4-head" style={{ marginBottom: 22 }}>
              <p className="v4-num"><b>03</b> / Проекты в посёлке</p>
              <h2 className="v3-h2" data-move="lines">Типы домов <em>в «{e.name}»</em></h2>
              <p className="v3-lead" data-move="up">
                В этом посёлке представлено {estateTypes.length} {plural(estateTypes.length, 'типовой проект', 'типовых проекта', 'типовых проектов')}. Сравните архитектуру, планировку и бюджет.
              </p>
            </div>
            <div className="v3-wrap v4-estate-types">
              {estateTypes.map((t) => {
                const storeyLabel =
                  t.storeys === 2 ? '2 этажа' : t.mansard ? `с мансардой (+${formatArea(t.mansard)} м²)` : '1 этаж'
                const specs = [
                  t.area ? `${formatArea(t.area)} м²` : null,
                  t.bedrooms ? `${t.bedrooms} ${plural(t.bedrooms, 'спальня', 'спальни', 'спален')}` : null,
                  storeyLabel,
                  t.minPlot ? `уч. от ${String(t.minPlot).replace('.', ',')} сот.` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <article key={t.slug} className="v4-etype-card" data-move="up">
                    <figure className="v4-etype-card__photo">
                      {t.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.photo} alt={`Проект «${t.name}»`} loading="lazy" />
                      ) : (
                        <span className="v3-card__noimg">Фото скоро</span>
                      )}
                      <figcaption>Изображение проекта</figcaption>
                    </figure>

                    <div className="v4-etype-card__plan">
                      {t.plan ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.plan} alt={`Планировка «${t.name}»`} loading="lazy" />
                      ) : (
                        <span className="v3-card__noimg">Планировка скоро</span>
                      )}
                    </div>

                    <div className="v4-etype-card__info">
                      <div className="v4-etype-card__head">
                        <h3>{t.name}</h3>
                        {t.freeInEstate > 0 ? (
                          <span className="v3-status">
                            <i />
                            {t.freeInEstate} в продаже в «{e.name}»
                          </span>
                        ) : (
                          <span className="v3-status v3-status--off">
                            <i />
                            все {t.totalInEstate} проданы в посёлке
                          </span>
                        )}
                      </div>
                      {specs && <p className="v4-ts__specs">{specs}</p>}
                      <p className="v4-etype-card__price">
                        {t.minPrice ? `от ${formatMillions(t.minPrice)}` : 'Все варианты в этом посёлке проданы'}
                      </p>
                      <p className="v4-etype-card__note">
                        {t.freeInEstate > 0
                          ? `В «${e.name}» ${t.freeInEstate} ${plural(t.freeInEstate, 'свободный дом', 'свободных дома', 'свободных домов')} этого типа (всего по проекту в посёлке — ${t.totalInEstate}).`
                          : 'Вы можете посмотреть планировку проекта и выбрать такой же тип дома в другом нашем посёлке.'}
                      </p>
                      <div className="v4-etype-card__btns">
                        {t.firstFreeHref ? (
                          <a className="v4-pik-btn v4-pik-btn--accent" href={t.firstFreeHref}>
                            <span>Смотреть дом →</span>
                          </a>
                        ) : (
                          <a className="v4-pik-btn v4-pik-btn--accent" href={t.projectHref}>
                            <span>Смотреть проект →</span>
                          </a>
                        )}
                        <a className="v4-pik-btn" href={t.projectHref}>
                          <span>Планировка и детали →</span>
                        </a>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {/* 5. Свободные дома в посёлке с фильтром по типу в стиле ПИК (скрываем дубль, если в продаже всего 1 дом — он уже крупно показан выше) */}
        {free.length > 1 && (
          <section className="v3-sec v4-sec" id="doma">
            <div className="v3-wrap v4-head" style={{ marginBottom: 18 }}>
              <p className="v4-num"><b>04</b> / Дома списком</p>
              <h2 className="v3-h2" data-move="lines">
                {`${free.length} ${plural(free.length, 'дом', 'дома', 'домов')}`} <em>в «{e.name}»</em>
              </h2>
            </div>
            <div className="v3-wrap">
              <HousePicker houses={pick} catalogHref="/v4/doma" grid typeFilter />
            </div>
          </section>
        )}

        <V4Final
          company={company}
          context={`Посёлок v4: ${e.name}`}
          lead={`Покажем посёлок «${e.name}» и свободные участки вживую или по видеосвязи. Ответим про документы и ипотеку.`}
          bg={v4img('И4')?.src ?? '/design/hero-morning.webp'}
        />
        <V4Footer since={company.since} phone={company.phone} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
