import type { Metadata } from 'next'
import { Words } from '@/components/Words'
import { getCompany, getEstates, getProjects, getRegions } from '@/lib/data'
import { mainHref } from '@/lib/site'
import { regionView } from '@/lib/view'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'О компании',
  description: 'Строительная компания «Хороший дом»: строим и продаём капитальные кирпичные дома с участком. Гарантия 5 лет.',
  alternates: { canonical: '/about' },
}

export default async function AboutPage() {
  const [company, regions, estates, projects] = await Promise.all([getCompany(), getRegions(), getEstates(), getProjects()])
  const active = regions.filter((r) => r.status === 'active').map(regionView)
  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={mainHref('/')}>Главная</a>
          <span>О компании</span>
        </nav>
        <h1 className="title title--lg">Строительная компания «{company.name}»</h1>
        <p className="lead">
          {company.since ? `С ${company.since} года ` : ''}строим и продаём капитальные кирпичные дома для круглогодичной жизни. Сегодня — {estates.length}{' '}
          посёлков и {projects.length} проектов домов{active.length ? ` в регионе ${active.map((r) => r.name).join(', ')}` : ''}.
        </p>
      </div>

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
