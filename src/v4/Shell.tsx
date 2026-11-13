/**
 * v4 · общий каркас страниц (сайт многостраничный, Илья 12.11): шрифты, шапка, финал с записью на показ, подвал.
 * Главная v4 и страница дома v4 собираются из одних и тех же кусков, поэтому шапка и форма везде одинаковые.
 * Шапка на главной выезжает, когда пройден первый экран (html.past-hero ставит HeroNight); на других страницах — всегда.
 */
import type { CSSProperties } from 'react'
import { LeadForm } from '@/components/LeadForm'
import type { Company } from '@/payload-types'

// Noto Serif Display с осью ширины: next/font (Turbopack) на нём падает — ссылка на Google Fonts; перед запуском — свой сервер
const NOTO_CSS = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Display:ital,wdth,wght@0,62.5..100,300..600;1,62.5..100,300..600&display=swap'

// черновик v4 ведёт на свои страницы. При переезде v4 на «/» адреса станут /catalog, /projects, /locations, /mortgage,
// /about, /contacts — как сейчас у v2 (тогда здесь — mainHref(...)).
export const NAV = [
  { href: '/v4/doma', label: 'Дома в продаже' },
  { href: '/v4/proekty', label: 'Проекты' },
  { href: '/v4/poselki', label: 'Посёлки' },
  { href: '/v4/ipoteka', label: 'Ипотека' },
  { href: '/v4/o-kompanii', label: 'О компании' },
  { href: '/v4/kontakty', label: 'Контакты' },
]

export const telOf = (phone?: string | null) => phone?.replace(/[^\d+]/g, '') || null

export function V4Fonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={NOTO_CSS} precedence="default" />
    </>
  )
}

export function V4Bar({ phone, always = false, home = '/v4' }: { phone?: string | null; always?: boolean; home?: string }) {
  const tel = telOf(phone)
  return (
    <div className={`v4-bar${always ? ' v4-bar--always' : ''}`}>
      <div className="v3-wrap v4-bar__in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href={home} aria-label="Хороший дом — на главную"><img src="/v3/logo.svg" alt="Хороший дом" width={86} height={40} /></a>
        <nav aria-label="Разделы сайта">{NAV.map((x) => <a key={x.href} href={x.href}>{x.label}</a>)}</nav>
        <div className="v3-row">
          {tel && <a className="v4-bar__tel" href={`tel:${tel}`}>{phone}</a>}
          <a className="v3-btn v3-btn--main v4-bar__btn" href="#evf-form">Записаться на показ</a>
        </div>
      </div>
    </div>
  )
}

/** Финал: «Приезжайте на показ» — офисы, телефон и форма. id="evf-form" — сюда ведут все кнопки «Записаться на показ». */
export function V4Final({ company, n, context, title = 'Приезжайте', em = 'на показ', lead, bg }: {
  company: Company; n?: string; context: string; title?: string; em?: string; lead?: string
  /** вечер с огнями в окнах (И4) — по сюжету финал это вечер; без картинки — белый финал */
  bg?: string
}) {
  return (
    <section className={`v3-sec v3-final v4-sec v4-final${bg ? ' v4-final--bg' : ''}`} id="pokaz" style={bg ? ({ '--final-bg': `url(${bg})` } as CSSProperties) : undefined}>
      <span className="v4-ghost" aria-hidden>Показ</span>
      <div className="v3-wrap v3-split v4-head">
        <div>
          {n && <p className="v4-num"><b>{n}</b> / Запись на показ</p>}
          <h2 className="v3-h2" data-move="lines">{title} <em>{em}</em></h2>
          <p className="v3-lead">{lead ?? 'Покажем дом и посёлок вживую или по видеосвязи, если вы в другом городе. Ответим про участок, документы и ипотеку.'}</p>
          <ul className="v3-offices">{(company.offices ?? []).map((o) => <li key={o.title}><b>{o.title}</b><span>{[o.address, o.hours].filter(Boolean).join(' · ')}</span></li>)}</ul>
          {company.phone && <p className="v3-final__tel">{company.phone}</p>}
        </div>
        <div className="v3-final__form" id="evf-form">
          <LeadForm light cta="Записаться на показ" target={{ interest: 'buy', context }} />
        </div>
      </div>
    </section>
  )
}

const FOOT = 'Хороший дом'

export function V4Footer({ since }: { since?: number | null }) {
  return (
    <footer className="v4-foot">
      <div className="v3-wrap v4-foot__top">
        <p>Строим и продаём кирпичные дома с участком под Краснодаром{since ? ` с ${since} года` : ''}: Динская, Новая Адыгея, Козет.</p>
        <nav aria-label="Разделы сайта в подвале">{NAV.map((x) => <a key={x.href} href={x.href}>{x.label}</a>)}</nav>
      </div>
      <p className="v4-foot__word" aria-hidden>{[...FOOT].map((ch, k) => <span key={k} style={{ '--i': k } as CSSProperties}>{ch === ' ' ? ' ' : ch}</span>)}</p>
    </footer>
  )
}

/** Шапка внутренней страницы v4: подпись, огромное бледное слово, заголовок капителью с курсивным словом, подзаголовок. */
export function V4PageHead({ eyebrow, ghost, title, em, lead }: { eyebrow: string; ghost: string; title: string; em?: string; lead?: string }) {
  return (
    <section className="v3-sec v4-sec v4-page-head">
      <span className="v4-ghost" aria-hidden>{ghost}</span>
      <div className="v3-wrap v4-head">
        <nav className="v4-dom__crumbs" aria-label="Навигация"><a href="/v4">Главная</a><span aria-hidden>/</span><span>{eyebrow}</span></nav>
        <h1 className="v3-h2 v4-page-head__h1" data-move="lines">{title}{em ? <> <em>{em}</em></> : null}</h1>
        {lead && <p className="v3-lead" data-move="up">{lead}</p>}
      </div>
    </section>
  )
}
