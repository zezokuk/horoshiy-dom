import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PlanRender } from '@/components/PlanRender'
import { getCompany, getHouses, getProject, img, plural } from '@/lib/data'
import { formatArea, formatMillions } from '@/lib/format'
import { JsonLd, breadcrumbsLd } from '@/lib/seo'
import { mainHref } from '@/lib/site'
import { cleanPhotoUrl, houseView, roomsView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { HousePicker, type PickHouse } from '@/v3/home/HousePicker'
import { StickyCta } from '@/v3/home/StickyCta'
import { Mortgage } from '@/v4/Mortgage'
import { v4img } from '@/v4/images'
import { V4Bar, V4Final, V4Fonts, V4Footer } from '@/v4/Shell'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 · страница проекта (черновик, 13.11) — «дом по типам» глубже: фото проекта, цифры, планировка с площадями комнат,
 * дома этого проекта в продаже (включая варианты В2–В5), платёж по ипотеке, запись на показ.
 * Канонический адрес — страница проекта v2 (`/projects/<slug>`), пока v4 черновик.
 */
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = await getProject(slug)
  if (!p) return {}
  return {
    title: { absolute: `Проект дома «${p.name}»${p.area ? `: ${formatArea(p.area)} м²` : ''}${p.bedrooms ? `, ${p.bedrooms} ${plural(p.bedrooms, 'спальня', 'спальни', 'спален')}` : ''} · Хороший дом` },
    description: `Кирпичный дом по проекту «${p.name}»: планировка с площадями комнат и дома этого проекта, которые продаются сейчас под Краснодаром.`,
    robots: { index: false, follow: false },
    alternates: { canonical: mainHref(`/projects/${p.slug}`) },
  }
}

export default async function V4Project({ params }: Props) {
  const { slug } = await params
  const p = await getProject(slug)
  if (!p) notFound()
  const [company, all] = await Promise.all([getCompany(), getHouses({ status: 'free' })])
  const mine = all.filter((h) => (typeof h.project === 'object' ? h.project?.id : h.project) === p.id).map(houseView).sort((a, b) => a.price - b.price)
  const photo = cleanPhotoUrl(img(p.photo, 'wide'))
  const render = (p.slug === 'tip-5' ? v4img('П1')?.src : undefined) ?? img(p.render, 'wide')
  const plan = img(p.plan, 'wide')
  const rooms = render ? roomsView(p) : []
  const fam = { rate: company.family?.rate ?? 6, years: company.family?.years ?? 30, minDown: company.family?.minDown ?? 20, limit: company.family?.limit ?? 6_000_000 }
  const pick: PickHouse[] = mine.map((h) => ({
    code: h.code, title: h.title, area: h.area, plot: h.plot, price: h.price, estate: h.estateName,
    photo: h.photoCard ?? h.photo, href: `/v4/dom/${h.code}`, caption: 'Изображение проекта',
  }))
  const areas = mine.map((h) => h.area)

  const facts = [
    p.area ? { v: `${formatArea(p.area)} м²`, l: p.mansard ? `дом + мансарда ${formatArea(p.mansard)} м²` : 'площадь по проекту' } : null,
    p.bedrooms ? { v: String(p.bedrooms), l: plural(p.bedrooms, 'спальня', 'спальни', 'спален') } : null,
    p.bathrooms ? { v: String(p.bathrooms), l: plural(p.bathrooms, 'санузел', 'санузла', 'санузлов') } : null,
    { v: p.storeys === 2 ? '2' : '1', l: p.storeys === 2 ? 'этажа' : p.mansard ? 'этаж и мансарда' : 'этаж' },
    { v: String(mine.length), l: `${plural(mine.length, 'дом', 'дома', 'домов')} в продаже` },
  ].filter((f): f is { v: string; l: string } => f !== null)

  return (
    <div className="v3 v4 v4-house">
      <V4Fonts />
      <JsonLd data={breadcrumbsLd([{ name: 'Главная', url: mainHref('/') }, { name: 'Проекты', url: mainHref('/projects') }, { name: p.name, url: mainHref(`/projects/${p.slug}`) }])} />
      <V4Bar phone={company.phone} always />
      <MotionRoot smooth={false}>
        <header className="v4-dom">
          <figure className="v4-dom__photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo ? <img src={photo} alt={`Дом по проекту «${p.name}»`} fetchPriority="high" /> : <span className="v3-card__noimg">Фото скоро</span>}
            <figcaption>Изображение проекта</figcaption>
          </figure>
          <div className="v4-dom__panel">
            <nav className="v4-dom__crumbs" aria-label="Навигация"><a href="/v4">Главная</a><span aria-hidden>/</span><a href="/v4/proekty">Проекты</a></nav>
            <h1>{p.name}</h1>
            <p className="v4-dom__where">{[p.area ? `${formatArea(p.area)} м²` : null, p.bedrooms ? `${p.bedrooms} ${plural(p.bedrooms, 'спальня', 'спальни', 'спален')}` : null, p.storeys === 2 ? 'два этажа' : p.mansard ? 'с мансардой' : 'один этаж'].filter(Boolean).join(' · ')}</p>
            {mine.length > 0 ? (
              <>
                <p className="v4-price v4-dom__price">от {formatMillions(mine[0].price)}</p>
                <p className="v3-note">{mine.length} {plural(mine.length, 'дом', 'дома', 'домов')} в продаже{areas.length && Math.min(...areas) !== Math.max(...areas) ? `, площади вариантов — от ${formatArea(Math.min(...areas))} до ${formatArea(Math.max(...areas))} м²` : ''}.</p>
              </>
            ) : <p className="v3-note">Сейчас домов этого проекта в продаже нет. Оставьте телефон — сообщим, когда появятся, или подберём похожий.</p>}
            {(p.features ?? []).length > 0 && <ul className="v4-chips-list">{p.features!.map((f) => <li key={f}>{f}</li>)}</ul>}
            <div className="v3-row v4-dom__cta">
              {mine.length > 0 && <a className="v3-btn v3-btn--main" href="#doma">Дома этого проекта</a>}
              <a className="v3-btn v4-btn--line" href="#evf-form">Записаться на показ</a>
            </div>
          </div>
        </header>

        <section className="v3-sec v4-sec v4-dom__facts">
          <div className="v3-wrap v4-nums__rows">
            {facts.map((f) => <div className="v4-nums__row" key={f.l}><b>{f.v}</b><span>{f.l}</span></div>)}
          </div>
        </section>

        {(render || plan) && (
          <section className="v3-sec v3-sec--linen v4-sec" id="plan">
            <div className="v3-wrap v4-head">
              <p className="v4-num">Планировка</p>
              <h2 className="v3-h2" data-move="lines">Как устроен <em>дом</em></h2>
              {render && <p className="v3-lead">Наведите на комнату — подсветим её площадь. Мебель на виде сверху — для примера.</p>}
            </div>
            <div className="v3-wrap">
              {render ? <PlanRender render={render} plan={plan} rooms={rooms} alt={`Планировка «${p.name}»`} /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="v4-dom__plan" src={plan!} alt={`Планировка «${p.name}»`} loading="lazy" />
              )}
            </div>
          </section>
        )}

        {mine.length > 0 && (
          <>
            <section className="v3-sec v4-sec" id="doma">
              <div className="v3-wrap v4-head">
                <p className="v4-num">В продаже</p>
                <h2 className="v3-h2" data-move="lines">{p.name}: <em>{`${mine.length} ${plural(mine.length, 'дом', 'дома', 'домов')}`}</em></h2>
              </div>
              <div className="v3-wrap v3-wrap--wide"><HousePicker houses={pick} catalogHref={mainHref('/catalog')} /></div>
            </section>
            <section className="v3-sec v3-sec--sky v4-sec" id="ipoteka">
              <div className="v3-wrap v4-head">
                <p className="v4-num">Ипотека</p>
                <h2 className="v3-h2" data-move="lines">Платёж <em>в месяц</em></h2>
              </div>
              <div className="v3-wrap"><Mortgage houses={mine.map((h) => ({ code: h.code, label: `${h.title}, ${h.estateName}`, price: h.price }))} family={fam} /></div>
            </section>
          </>
        )}

        <V4Final company={company} context={`Проект v4: ${p.name}`} lead={`Покажем построенный «${p.name}» вживую или по видеосвязи. Ответим про участок, документы и ипотеку.`} />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
