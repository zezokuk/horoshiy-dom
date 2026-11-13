import type { Metadata } from 'next'
import { getCompany, getEstates, getHouses, getProjects, img, plural } from '@/lib/data'
import { estateView } from '@/lib/view'
import { MotionRoot } from '@/v3/motion/MotionRoot'
import { StickyCta } from '@/v3/home/StickyCta'
import { V4Bar, V4Final, V4Fonts, V4Footer, V4PageHead } from '@/v4/Shell'
import '@/v3/v3.css'
import '@/v4/v4.css'

/**
 * v4 · «О компании» (черновик, 13.11). Только проверяемое: с 2014 года (первый таунхаус), сколько домов построено и продано
 * в готовых посёлках (по данным посёлков в админке), свои проекты, гарантия, принципы из админки. Блок основателя
 * появляется сам, когда в админке «Компания → Основатель» будет фото и фразы.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'О компании «Хороший дом»: строим кирпичные дома под Краснодаром с 2014 года' },
  description: 'СК «Хороший дом»: с 2014 года строим кирпичные дома в своих посёлках по своим проектам. Готовые посёлки, проекты, гарантия 5 лет.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/about' },
}

// принципы — из админки, без рекламных («не хуже особняков») и без сценария стройки (он на отдельной странице)
const SKIP = ['Не хуже особняков', 'Дом за 6 месяцев']

export default async function V4About() {
  const [company, estates, projects, houses] = await Promise.all([getCompany(), getEstates(), getProjects(), getHouses()])
  const views = estates.map((e) => estateView(e, houses))
  const sold = views.filter((v) => v.status === 'soldOut')
  const builtSold = sold.reduce((s, v) => s + (v.homes ?? 0), 0)
  const live = views.filter((v) => v.status !== 'planned')
  const f = company.founder
  const founderPhoto = img(f?.photo, 'card')
  const facts = [
    company.since ? { v: String(company.since), l: 'первый дом — таунхаус' } : null,
    builtSold ? { v: String(builtSold), l: `${plural(builtSold, 'дом', 'дома', 'домов')} построено и продано в ${sold.map((s) => `«${s.name}»`).join(' и ')}` } : null,
    { v: String(live.length), l: `${plural(live.length, 'посёлок', 'посёлка', 'посёлков')} под Краснодаром` },
    { v: String(projects.length), l: `${plural(projects.length, 'проект', 'проекта', 'проектов')} — только свои` },
    { v: '5 лет', l: 'гарантия на капитальные дефекты' },
  ].filter((x): x is { v: string; l: string } => x !== null)
  const principles = (company.advantages ?? []).filter((a) => !SKIP.includes(a.title))

  return (
    <div className="v3 v4">
      <V4Fonts />
      <V4Bar phone={company.phone} always />
      <MotionRoot>
        <V4PageHead eyebrow="О компании" ghost="2014" title="Строим дома" em={company.since ? `с ${company.since} года` : 'под Краснодаром'}
          lead="Начинали с одного таунхауса. Сегодня строим посёлки в Адыгее и Динской — только на своей земле и только по своим проектам. В команде — архитекторы и инженеры." />

        <section className="v3-sec v3-sec--linen v4-sec v4-nums" style={{ paddingTop: 40 }}>
          <div className="v3-wrap v4-nums__rows">
            {facts.map((x) => <div className="v4-nums__row" key={x.l}><b>{x.v}</b><span>{x.l}</span></div>)}
          </div>
        </section>

        {f?.name && f.quote && (
          <section className="v3-sec v4-sec">
            <div className="v3-wrap v3-split v4-founder">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {founderPhoto && <img src={founderPhoto} alt={f.name} loading="lazy" />}
              <blockquote>
                <p>«{f.quote}»</p>
                <cite>{f.name}{f.role ? ` · ${f.role}` : ''}</cite>
              </blockquote>
            </div>
          </section>
        )}

        {principles.length > 0 && (
          <section className="v3-sec v4-sec">
            <div className="v3-wrap v4-head">
              <p className="v4-num">Как мы строим</p>
              <h2 className="v3-h2" data-move="lines">Принципы <em>без украшений</em></h2>
            </div>
            <ul className="v3-wrap v4-progs v4-progs--wide">
              {principles.map((a) => <li key={a.title} data-move="up"><b>{a.title}</b><span>{a.text}</span></li>)}
            </ul>
          </section>
        )}

        <section className="v3-sec v3-sec--mist v4-sec">
          <div className="v3-wrap v4-head">
            <p className="v4-num">Наши посёлки</p>
            <h2 className="v3-h2" data-move="lines">Что уже <em>построено</em></h2>
          </div>
          <ul className="v3-wrap v4-near v4-near--estates">
            {views.map((v) => (
              <li key={v.slug}>
                <a href={`/v4/poselok/${v.slug}`}>{v.name}</a>
                <b>{v.status === 'soldOut' ? `продан${v.homes ? ` · ${v.homes} ${plural(v.homes, 'дом', 'дома', 'домов')}` : ''}` : v.status === 'planned' ? 'скоро старт продаж' : `${v.free} в продаже`}</b>
              </li>
            ))}
          </ul>
        </section>

        <V4Final company={company} context="О компании v4: запись на показ" title="Посмотрите" em="построенное" lead="Приезжайте в «Южный ветер» или Динскую: покажем дома, в которых уже живут, и те, что продаются." />
        <V4Footer since={company.since} />
      </MotionRoot>
      <StickyCta phone={company.phone} />
    </div>
  )
}
