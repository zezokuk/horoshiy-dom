import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EstatesMap } from '@/components/EstatesMap'
import { Genplan } from '@/components/Genplan'
import { HouseCard } from '@/components/HouseCard'
import { LeadInline } from '@/components/LeadForm'
import { Nearby } from '@/components/Nearby'
import { Pic } from '@/components/Pic'
import { SketchToHouse } from '@/components/SketchToHouse'
import { getDesign, getEstate, getHouses, getProjects, getRegion, img } from '@/lib/data'
import { effectOn, withSeo } from '@/lib/look'
import { formatMillions, plural } from '@/lib/format'
import { regionHref } from '@/lib/site'
import { JsonLd, breadcrumbsLd, estateLd, pageOg } from '@/lib/seo'
import { estateView, genplanEstate, houseView } from '@/lib/view'
import type { Estate, Region } from '@/payload-types'

export const revalidate = 60

type Props = { params: Promise<{ region: string; slug: string }> }

async function load(params: Props['params']) {
  const { region: rs, slug } = await params
  const [region, estate] = await Promise.all([getRegion(rs), getEstate(slug)])
  // an estate is shown only under its own region: /r/msk/objects/kalina/ is a 404, not a duplicate
  if (!region || !estate || (estate.region as Region)?.slug !== region.slug) return null
  return { region, estate }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load(params)
  if (!d) return {}
  const { estate: e, region } = d
  // «SEO» fields of the estate in the admin win over the text built here
  const meta = withSeo({
    title: `${e.kind || 'Посёлок'} «${e.name}», ${e.place}`,
    // a fresh estate may have no texts yet: a plain line instead of an empty description
    description:
      [e.tagline, e.description].filter(Boolean).join('. ') ||
      (e.status === 'planned'
        ? `${e.kind || 'Посёлок'} «${e.name}»${e.place ? `, ${e.place}` : ''}. Старт продаж скоро — оставьте телефон, чтобы узнать первыми.`
        : `${e.kind || 'Посёлок'} «${e.name}»${e.place ? `, ${e.place}` : ''}: дома с участком, генплан и цены.`),
    alternates: { canonical: regionHref(region.slug, `/objects/${e.slug}`) },
  }, e.seo)
  const image = img(e.poster, 'wide') ?? img(e.cover, 'wide')
  return {
    ...meta,
    openGraph: pageOg({ title: String(meta.title), description: meta.description ?? undefined, url: regionHref(region.slug, `/objects/${e.slug}`), image }),
  }
}

export default async function EstatePage({ params }: Props) {
  const d = await load(params)
  if (!d) notFound()
  const { region, estate: e } = d
  if (e.status === 'planned') return <ComingEstate region={region} e={e} />
  const [rawHouses, design] = await Promise.all([getHouses({ estate: e.id }), getDesign()])
  const v2 = ['listva', 'shalfey'].includes(design.palette)
  const houses = rawHouses.map(houseView)
  const free = houses.filter((h) => h.status === 'free')
  const scheme = img(e.scheme, 'wide')
  const sorted = [...houses].sort((a, b) => (a.status === b.status ? a.price - b.price : a.status === 'free' ? -1 : 1))
  // a fresh estate may have no houses or pictures yet: fall back to its 3D poster or cover, else no picture column
  const photo = free[0]?.photo ?? houses.find((h) => h.photo)?.photo ?? img(e.poster, 'wide') ?? img(e.cover, 'wide')
  const photoPhone = free[0]?.photoCard ?? houses.find((h) => h.photoCard)?.photoCard ?? img(e.poster, 'card') ?? img(e.cover, 'card')
  const priceFrom = free.length ? Math.min(...free.map((h) => h.price)) : null
  const cover = img(e.cover, 'card')
  const plot = houses.find((h) => h.plot)?.plot?.replace(/\s*сот\.?$/, '')
  const eyebrow = [e.kind, e.place].filter(Boolean).join(' · ')
  const target = { region: region.slug, context: `${region.name}: ${e.name}`, phone: region.office?.phone, hours: region.office?.hours }

  return (
    <>
      <JsonLd data={estateLd(e, region, houses)} />
      <JsonLd
        data={breadcrumbsLd([
          { name: region.name, url: regionHref(region.slug) },
          { name: e.name, url: regionHref(region.slug, `/objects/${e.slug}`) },
        ])}
      />
      {v2 ? (
        // v2: a house of this estate on the whole screen, the name in Forum like on the client's cover, the facts as
        // badges on the photo; the client's own cover stands beside it like a booklet (it has the logo and the slogan)
        <section className={`v2-hero v2-hero--estate ${photo ? '' : 'v2-hero--none'}`}>
          {photo && (
            <div className="v2-hero__img">
              {/* the 1600 px copy on phones too: the 640 px one is blurry on a full-height screen */}
              <Pic src={photo} alt={`Дом в посёлке ${e.name}`} priority />
            </div>
          )}
          <div className="container v2-hero__in">
            <nav className="crumbs" aria-label="Навигация">
              <a href={regionHref(region.slug)}>{region.name}</a>
              <span>{e.name}</span>
            </nav>
            <div className="v2-hero__text">
              {eyebrow && <p className="v2-hero__eyebrow">{eyebrow}</p>}
              <h1 className="v2-hero__title v2-hero__title--xl">{e.name}</h1>
              {e.tagline && <p className="v2-hero__lead">{e.tagline}</p>}
              <ul className="v2-hero__badges">
                {priceFrom && <li>от {formatMillions(priceFrom)}</li>}
                <li>
                  {!free.length
                    ? 'Все дома проданы'
                    : e.homes
                      ? `свободно ${free.length} из ${e.homes} ${plural(e.homes, 'дома', 'домов', 'домов')}`
                      : `свободно ${free.length} ${plural(free.length, 'дом', 'дома', 'домов')}`}
                </li>
                {plot && <li>участки {plot} сот.</li>}
              </ul>
              <div className="btns">
                <a href="#genplan" className="btn btn--light">
                  Смотреть генплан
                </a>
                <a href="#lead" className="btn v2-hero__ghost">
                  Записаться на показ
                </a>
              </div>
            </div>
            {cover && <img className="v2-hero__poster" src={cover} alt={`Обложка посёлка «${e.name}»`} loading="lazy" decoding="async" />}
          </div>
        </section>
      ) : (
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={regionHref(region.slug)}>{region.name}</a>
          <span>{e.name}</span>
        </nav>
        <div className={`obj-hero ${photo ? '' : 'obj-hero--solo'}`}>
          {photo && (
            <div className="obj-hero__img">
              <Pic src={photo} phone={photoPhone} alt={`Дом в посёлке ${e.name}`} priority />
            </div>
          )}
          <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1 className="title title--xl">{e.name}</h1>
            {e.tagline && <p className="lead">{e.tagline}</p>}
            {e.description && <p>{e.description}</p>}
            <div className="facts">
              {!!e.homes && (
                <div className="fact">
                  <b>{e.homes}</b>
                  <span>{plural(e.homes, 'дом', 'дома', 'домов')} в проекте</span>
                </div>
              )}
              <div className="fact">
                <b>{free.length || 'Продан'}</b>
                <span>{free.length ? 'свободно сейчас' : 'полностью'}</span>
              </div>
              {priceFrom && (
                <div className="fact">
                  <b>{formatMillions(priceFrom)}</b>
                  <span>цена от</span>
                </div>
              )}
              {plot && (
                <div className="fact">
                  <b>{plot}</b>
                  <span>соток участок</span>
                </div>
              )}
            </div>
            <div className="btns">
              <a href="#genplan" className="btn btn--green">
                Смотреть генплан
              </a>
              <a href="#lead" className="btn btn--ghost" style={{ color: 'var(--green-deep)' }}>
                Записаться на показ
              </a>
            </div>
          </div>
        </div>
      </div>
      )}

      <section className="section" id="genplan" style={{ paddingTop: v2 ? 72 : 40 }}>
        <div className="container">
          <div className="head head--split">
            <div style={{ display: 'grid', gap: 14 }}>
              <p className="eyebrow">Генплан</p>
              <h2 className="title title--lg">Выберите дом в 3D</h2>
            </div>
            <p className="lead">Покрутите посёлок и нажмите на дом. Свободные подсвечены зелёным и подписаны ценой — увидите фото, площадь и участок.</p>
          </div>
          <Genplan estate={genplanEstate(e, houses.length)} houses={houses} stage />
          {scheme && (
            <details className="scheme-src">
              <summary>Генплан застройщика</summary>
              <img src={scheme} alt={`Генплан «${e.name}» от застройщика`} loading="lazy" />
            </details>
          )}
          <LeadInline title={`Показ в «${e.name}»`} text="Покажем дома вживую или по видеосвязи — в удобное время, без обязательств." cta="Записаться на показ" target={target} />
        </div>
      </section>

      <section className="section section--paper">
        <div className="container">
          <div className="head">
            <p className="eyebrow">Дома</p>
            <h2 className="title title--lg">{free.length ? `${free.length} ${plural(free.length, 'дом', 'дома', 'домов')} в продаже` : 'Все дома проданы'}</h2>
            {!free.length && <p className="lead">Посмотрите свободные дома в соседних посёлках или оставьте заявку — сообщим о новой очереди.</p>}
          </div>
          <div className="grid grid--3">
            {sorted.map((h) => (
              <HouseCard key={h.code} h={h} showEstate={false} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split" style={{ alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 18 }}>
            <p className="eyebrow">Расположение</p>
            <h2 className="title title--md">{e.address || e.place}</h2>
            {!!e.nearby?.length && <Nearby items={e.nearby} />}
            {!!e.infrastructure?.length && (
              <>
                <h3 className="title" style={{ fontSize: 24, marginTop: 10 }}>
                  Рядом
                </h3>
                <ul className="dots">
                  {e.infrastructure.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </>
            )}
            {!!e.utilities?.length && (
              <>
                <h3 className="title" style={{ fontSize: 24, marginTop: 10 }}>
                  Коммуникации
                </h3>
                <div className="chips">
                  {e.utilities.map((u) => (
                    <span key={u} className="chip">
                      {u}
                    </span>
                  ))}
                </div>
              </>
            )}
            {e.lat && e.lng && (
              <a className="btn btn--green" style={{ justifySelf: 'start', marginTop: 8 }} href={`https://yandex.ru/maps/?rtext=~${e.lat},${e.lng}&rtt=auto`} target="_blank" rel="noreferrer">
                Построить маршрут
              </a>
            )}
          </div>
          {e.lat && e.lng ? <EstatesMap estates={[estateView(e, rawHouses)]} /> : null}
        </div>
      </section>
    </>
  )
}

/**
 * An estate whose sales have not started (status «Скоро»): no houses, prices or plan yet — only where it is and a form
 * «tell me when sales start». The lead is marked «на будущее» and linked to the estate: a waitlist that collects demand
 * before the first house is built.
 */
async function ComingEstate({ region, e }: { region: Region; e: Estate }) {
  const [projects, design] = await Promise.all([getProjects(), getDesign()])
  const areas = projects.map((p) => p.area).filter((a): a is number => !!a)
  const photo = img(e.poster, 'wide') ?? img(e.cover, 'wide')
  const photoPhone = img(e.poster, 'card') ?? img(e.cover, 'card')
  const target = {
    region: region.slug,
    estate: e.slug,
    context: `${e.name}: старт продаж`,
    interest: 'future' as const,
    phone: region.office?.phone,
    hours: region.office?.hours,
  }
  return (
    <>
      <JsonLd
        data={breadcrumbsLd([
          { name: region.name, url: regionHref(region.slug) },
          { name: e.name, url: regionHref(region.slug, `/objects/${e.slug}`) },
        ])}
      />
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={regionHref(region.slug)}>{region.name}</a>
          <span>{e.name}</span>
        </nav>
        <div className={`obj-hero ${photo ? '' : 'obj-hero--solo'}`}>
          {photo && (
            <div className="obj-hero__img">
              <Pic src={photo} phone={photoPhone} alt={`Посёлок ${e.name}`} priority />
            </div>
          )}
          <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            <p className="eyebrow">{['Скоро', e.place].filter(Boolean).join(' · ')}</p>
            <h1 className="title title--xl">{e.name}</h1>
            <p className="lead">{e.tagline || 'Новый посёлок. Старт продаж скоро.'}</p>
            {e.description && <p>{e.description}</p>}
            <div className="btns">
              <a href="#soon" className="btn btn--gold">
                Узнать о старте продаж
              </a>
              <a href={regionHref(region.slug, '/catalog')} className="btn btn--ghost" style={{ color: 'var(--green-deep)' }}>
                Готовые дома сейчас
              </a>
            </div>
          </div>
        </div>
      </div>
      <section className="section" id="soon" style={{ paddingTop: 24 }}>
        <div className="container" style={{ display: 'grid', gap: 40 }}>
          <LeadInline
            title="Узнать о старте продаж первыми"
            text="Оставьте телефон — сообщим, когда откроются продажи, появятся первые дома и цены. Без навязчивых звонков."
            cta="Узнать о старте"
            target={target}
          />
          {e.lat && e.lng ? <EstatesMap estates={[estateView(e, [])]} zoom={12} /> : null}
        </div>
      </section>

      {/* references 5–6: there is no house here yet, only projects — so show how a project becomes a house
          (an example of one built project; which projects go here is announced with the sales, not promised now) */}
      {projects.length > 0 && effectOn(design, 'sketch') && (
        <SketchToHouse
          steps={[
            {
              title: 'Дома ещё нет',
              text: `Есть проекты: строим по ${projects.length} своим${areas.length ? `, от ${Math.min(...areas)} до ${Math.max(...areas)} м²` : ''}. Какие встанут в «${e.name}», покажем со стартом продаж.`,
            },
            { title: 'Каркас', text: 'Фундамент, кирпичные стены, кровля — материалы только с документами.' },
            { title: 'Дом', text: 'Капитальный дом под ключ за 6 месяцев, гарантия 5 лет.' },
          ]}
          caption="Пример: построенный дом по проекту «Тип 5», 105 м²"
        />
      )}
    </>
  )
}
