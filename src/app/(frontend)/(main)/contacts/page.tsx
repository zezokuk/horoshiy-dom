import type { Metadata } from 'next'
import { getCompany, getRegions } from '@/lib/data'
import { telHref } from '@/lib/format'
import { mainHref, regionHref } from '@/lib/site'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Контакты и офисы продаж',
  alternates: { canonical: '/contacts' },
}

export default async function ContactsPage() {
  const [company, regions] = await Promise.all([getCompany(), getRegions()])
  const offices = regions.filter((r) => r.office?.address || r.office?.phone)
  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={mainHref('/')}>Главная</a>
          <span>Контакты</span>
        </nav>
        <h1 className="title title--lg">Контакты и офисы продаж</h1>
        <p className="lead">Покажем дома вживую или проведём показ по видеосвязи, если вы в другом городе.</p>
      </div>
      <div className="container" style={{ display: 'grid', gap: 18, paddingBottom: 40 }}>
        {offices.map((r) => (
          <div key={r.slug} className="office">
            <b>{r.name}</b>
            {r.office?.address && <span>{r.office.address}</span>}
            {r.office?.hours && <span>{r.office.hours}</span>}
            <div className="btns">
              {r.office?.phone && (
                <a href={telHref(r.office.phone)} className="btn btn--green">
                  {r.office.phone}
                </a>
              )}
              <a href={regionHref(r.slug)} className="btn btn--ghost" style={{ color: 'var(--green-deep)' }}>
                Дома в регионе
              </a>
            </div>
          </div>
        ))}
        <div className="office">
          <b>Компания</b>
          {company.phone && <a href={telHref(company.phone)}>{company.phone}</a>}
          {company.email && <a href={`mailto:${company.email}`}>{company.email}</a>}
          {company.telegram && (
            <a href={company.telegram} target="_blank" rel="noreferrer">
              Telegram-канал
            </a>
          )}
        </div>
      </div>
    </>
  )
}
