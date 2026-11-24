/**
 * v4 · общий каркас страниц (сайт многостраничный, 19.11 — дизайн-система Figma «задача»):
 * шрифты Cormorant + Onest (из layout.tsx), шапка с мобильным меню, финал с записью на показ, подвал.
 */
import type { CSSProperties } from 'react'
import { LeadForm } from '@/components/LeadForm'
import type { Company } from '@/payload-types'
import { V4MobileNav } from '@/v4/V4MobileNav'
import { SalesTriggerWidget } from '@/v4/SalesTriggerWidget'

export const NAV = [
  { href: '/v4/doma', label: 'Дома в продаже' },
  { href: '/v4/poselki', label: 'Посёлки' },
  { href: '/v4/ipoteka', label: 'Ипотека' },
  { href: '/v4/o-kompanii', label: 'О компании' },
  { href: '/v4/kontakty', label: 'Контакты' },
]

export const telOf = (phone?: string | null) => phone?.replace(/[^\d+]/g, '') || null

export function V4Fonts() {
  return null
}

export function V4Bar({ phone, always = false, home = '/v4' }: { phone?: string | null; always?: boolean; home?: string }) {
  const tel = telOf(phone)
  return (
    <header className={`v4-bar${always ? ' v4-bar--always' : ''}`}>
      <div className="v3-wrap v4-bar__in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href={home} className="v4-bar__logo" aria-label="Хороший дом — на главную"><img src="/v3/logo.svg" alt="Хороший дом" width={86} height={40} /></a>
        <nav aria-label="Разделы сайта">{NAV.map((x) => <a key={x.href} href={x.href}>{x.label}</a>)}</nav>
        <div className="v3-row v4-bar__actions">
          {tel && <a className="v4-bar__tel" href={`tel:${tel}`}>{phone}</a>}
          <a className="v3-btn v3-btn--main v4-bar__btn" href="#evf-form">Записаться на показ</a>
          <V4MobileNav nav={NAV} phone={phone} tel={tel} />
        </div>
      </div>
    </header>
  )
}

const mapRoute = (address: string) => `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`

/** Финал: с фоном — кубанский вечерний закат со светящимися окнами + форма и контакты. */
export function V4Final({ company, n, context, title = 'Приезжайте', em = 'на показ', lead, bg, showContacts = false, hideOffices = false }: {
  company: Company; n?: string; context: string; title?: string; em?: string; lead?: string
  bg?: string; showContacts?: boolean; hideOffices?: boolean
}) {
  const tel = telOf(company.phone)
  return (
    <>
      <section className={`v3-sec v3-final v4-sec v4-final${bg ? ' v4-final--cinema' : ''}`} id="pokaz">
        {!bg ? (
          <>
            <span className="v4-ghost" aria-hidden>показ</span>
            <div className="v3-wrap v3-split v4-head">
              <div>
                {n && <p className="v4-num"><b>{n}</b> / Запись на показ</p>}
                <h2 className="v3-h2" data-move="lines">{title} <em>{em}</em></h2>
                <p className="v3-lead" data-move="up">{lead ?? 'Покажем дом и посёлок вживую или по видеосвязи, если вы в другом городе. Ответим про участок, документы и ипотеку.'}</p>
                {!showContacts && !hideOffices && (
                  <>
                    <ul className="v3-offices">{(company.offices ?? []).map((o) => <li key={o.title}><b>{o.title}</b><span>{[o.address, o.hours].filter(Boolean).join(' · ')}</span></li>)}</ul>
                    {company.phone && <p className="v3-final__tel">{company.phone}</p>}
                  </>
                )}
              </div>
              <div className="v3-final__form" id="evf-form">
                <LeadForm light cta="Записаться на показ" target={{ interest: 'buy', context, phone: company.phone }} />
                <p className="v4-form-trust">Перезвоним в рабочее время, без спама · покажем живой дом или проведём видеотур</p>
              </div>
            </div>
          </>
        ) : (
          <div className="evf evf--css v4-final__cinema">
            <div className="evf__pane v4-final__pane">
              <div className="evf__frame v4-final__frame" aria-hidden>
                <picture>
                  <source media="(max-width: 759px)" srcSet="/design/hero-morning-phone.webp" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bg} alt="" loading="lazy" decoding="async" />
                </picture>
                <i className="evf__dim v4-final__dim" />
                <i className="evf__sky v4-final__sky" />
                <i className="v4-final__sun-glow" />
                <i className="evf__win evf__win--l" />
                <i className="evf__win evf__win--door" />
                <i className="evf__win evf__win--r" />
                <i className="evf__spill" />
              </div>
              <i className="evf__scrim v4-final__scrim" aria-hidden />
              <div className="evf__copy v4-final__copy">
                <p className="v4-final__eyebrow">{n ? <><b>{n}</b> / </> : null}Вечер в своём доме · Кубань</p>
                <h2 className="v3-h2 v4-final__hero-h2" data-move="lines">
                  {title === 'Приезжайте' ? <>Ваша история <em>начинается здесь</em></> : <>{title} <em>{em}</em></>}
                </h2>
              </div>
            </div>

            <div className="v3-wrap v3-split v4-head v4-final__panel">
              <div className="v4-final__left">
                <p className="v3-lead" data-move="up">
                  {lead ?? 'Приезжайте посмотреть готовый дом вживую или проведём подробный видеотур и ответим на все вопросы по участку, документам и ипотеке.'}
                </p>
                <div className="v4-final__badges">
                  <span>200+ построенных домов с 2014 года</span>
                  <span>Семейная от 6%, IT, военная и сельская ипотека</span>
                  <span>Предчистовая отделка · гарантия 5 лет</span>
                </div>
                {!showContacts && (
                  <>
                    <ul className="v3-offices">{(company.offices ?? []).map((o) => <li key={o.title}><b>{o.title}</b><span>{[o.address, o.hours].filter(Boolean).join(' · ')}</span></li>)}</ul>
                    {company.phone && <p className="v3-final__tel">{company.phone}</p>}
                  </>
                )}
              </div>
              <div className="v3-final__form" id="evf-form">
                <p className="v4-final__form-title">Записаться на показ дома</p>
                <LeadForm light cta="Записаться на показ" target={{ interest: 'buy', context, phone: company.phone }} />
                <p className="v4-form-trust">Перезвоним в рабочее время, без спама · покажем живой дом или проведём видеотур</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {showContacts && (
        <section className="v3-sec v4-sec v4-contacts-sec" id="kontakty">
          <div className="v3-wrap v4-final__contacts">
            <div className="v4-final__chead">
              <span className="v4-ghost v4-ghost--inline" aria-hidden>связь</span>
              <p className="v4-num">Наши контакты</p>
              <h3 className="v3-h2 v4-final__ctitle" data-move="lines">Наши <em>контакты</em></h3>
            </div>
            <div className="v4-contacts">
              {(company.offices ?? []).map((o) => (
                <div key={o.title} className="v4-contacts__card" data-move="up">
                  <p className="v4-num">Офис продаж</p>
                  <h4>{o.title}</h4>
                  <p>{o.address}</p>
                  {o.hours && <p className="v3-note">{o.hours}</p>}
                  <a className="v4-types__all" href={mapRoute(o.address)} target="_blank" rel="noreferrer">Маршрут в Яндекс Картах →</a>
                </div>
              ))}
              <div className="v4-contacts__card v4-contacts__card--main" data-move="up">
                <p className="v4-num">Отдел продаж</p>
                {company.phone && <a className="v4-contacts__tel" href={tel ? `tel:${tel}` : undefined}>{company.phone}</a>}
                {company.email && <p><a href={`mailto:${company.email}`}>{company.email}</a></p>}
                {company.telegram && <p><a href={company.telegram} target="_blank" rel="noreferrer">Telegram-канал →</a></p>}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

const FOOT = 'Хороший дом'

export function V4Footer({ since, phone }: { since?: number | null; phone?: string | null }) {
  return (
    <>
      <footer className="v4-foot" data-phone={phone ?? ''}>
        <div className="v3-wrap v4-foot__top">
          <p>Строим и продаём готовые кирпичные дома с участком в собственных посёлках на Юге России{since ? ` с ${since} года` : ''}: Динская, Новая Адыгея, Козет.</p>
          <nav aria-label="Разделы сайта в подвале">{NAV.map((x) => <a key={x.href} href={x.href}>{x.label}</a>)}</nav>
        </div>
        <p className="v4-foot__word" aria-hidden>{[...FOOT].map((ch, k) => <span key={k} style={{ '--i': k } as CSSProperties}>{ch === ' ' ? ' ' : ch}</span>)}</p>
      </footer>
      <SalesTriggerWidget phone={phone} />
    </>
  )
}

/** Шапка внутренней страницы v4: подпись, огромное бледное слово, заголовок с курсивом, подзаголовок. */
export function V4PageHead({ eyebrow, ghost, title, em, lead }: { eyebrow: string; ghost: string; title: string; em?: string; lead?: string }) {
  return (
    <section className="v3-sec v4-sec v4-page-head">
      <span className="v4-ghost" aria-hidden>{ghost.toLowerCase()}</span>
      <div className={`v3-wrap v4-head${lead ? ' v4-page-head__grid' : ''}`}>
        <div>
          <nav className="v4-dom__crumbs" aria-label="Навигация"><a href="/v4">Главная</a><span aria-hidden>/</span><span>{eyebrow}</span></nav>
          <h1 className="v3-h2 v4-page-head__h1" data-move="lines">{title}{em ? <> <em>{em}</em></> : null}</h1>
        </div>
        {lead && <p className="v3-lead" data-move="up">{lead}</p>}
      </div>
    </section>
  )
}
