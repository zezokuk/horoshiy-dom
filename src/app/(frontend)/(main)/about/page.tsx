import type { Metadata } from 'next'
import { Words } from '@/components/Words'
import { getCompany, getEstates, getProjects, getRegions } from '@/lib/data'
import { plural } from '@/lib/format'
import { mainHref, regionHref } from '@/lib/site'
import { regionView } from '@/lib/view'
import { pageMeta } from '@/lib/look'

export const dynamic = 'force-dynamic' // shows statuses and counts: always fresh (see collections/revalidate.ts)

const META: Metadata = {
  title: 'О компании',
  description: 'Строительная компания «Хороший дом»: строим и продаём капитальные кирпичные дома с участком. Гарантия 5 лет.',
  alternates: { canonical: '/about' },
}
// title and description can be set in the admin: «SEO и поиск» → about
export const generateMetadata = () => pageMeta('about', META)

export default async function AboutPage() {
  const [company, regions, estates, projects] = await Promise.all([getCompany(), getRegions(), getEstates(), getProjects()])
  const active = regions.filter((r) => r.status === 'active').map(regionView)
  const built = estates.filter((e) => e.status !== 'planned')
  // sold-out estates are the company's track record: built and sold («в них живут» is not the client's words — 23.10)
  const sold = built.filter((e) => e.status === 'soldOut')
  const soldHomes = sold.reduce((s, e) => s + (e.homes || 0), 0)
  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={mainHref('/')}>Главная</a>
          <span>О компании</span>
        </nav>
        <h1 className="title title--lg">Строительная компания «{company.name}»</h1>
        <p className="lead">
          {company.since ? `С ${company.since} года ` : ''}строим и продаём капитальные кирпичные дома для круглогодичной жизни. Сегодня — {built.length}{' '}
          {plural(built.length, 'посёлок', 'посёлка', 'посёлков')} и {projects.length} проектов домов
          {active.length ? ` в регионе ${active.map((r) => r.name).join(', ')}` : ''}.
        </p>
      </div>

      {sold.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="container">
            <div className="head" data-reveal>
              <span className="idx">Уже построили и продали</span>
              <Words text={soldHomes ? `${soldHomes} ${plural(soldHomes, 'дом', 'дома', 'домов')} — *уже проданы*` : 'Посёлки, где всё *продано*'} />
            </div>
            <ul className="sold-list">
              {sold.map((e) => {
                const r = typeof e.region === 'object' ? e.region : null
                return (
                  <li key={e.slug} data-reveal>
                    <a href={r ? regionHref(r.slug, `/objects/${e.slug}`) : '#'}>
                      <b>«{e.name}»</b>
                      <span>{[e.place, e.homes ? `${e.homes} ${plural(e.homes, 'дом', 'дома', 'домов')}` : '', 'продан полностью'].filter(Boolean).join(' · ')}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="head" data-reveal>
            <span className="idx">Наши принципы</span>
            <Words text="Хороший дом — там, где *семья*" />
          </div>
          <div className="values">
            {(company.values || []).map((v, i) => (
              <div key={v.id ?? v.title} className="value" data-reveal>
                <i>{i + 1}</i>
                <b>{v.title}</b>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container">
          <div className="head" data-reveal>
            <span className="idx">Почему нам доверяют</span>
            <Words text="Что мы *гарантируем*" />
          </div>
          <div className="features">
            {(company.advantages || []).map((a, i) => (
              <div key={a.id ?? a.title} className="feature" data-reveal>
                <span className="feature__num">0{i + 1}</span>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(company.legalName || company.inn) && (
        <section className="section">
          <div className="container prose">
            <h2>Реквизиты</h2>
            <p>
              {company.legalName}
              {company.inn ? `, ИНН ${company.inn}` : ''}
              {company.ogrn ? `, ОГРН ${company.ogrn}` : ''}
              {company.legalAddress ? `. ${company.legalAddress}` : ''}
            </p>
          </div>
        </section>
      )}
    </>
  )
}
