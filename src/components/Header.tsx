'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { telHref } from '@/lib/format'
import type { RegionView } from '@/lib/view'
import { Logo } from './Logo'

export type NavItem = { href: string; label: string }

/**
 * One header for the brand site and every region. On a region it shows that office's phone
 * and a switcher, so a visitor from Moscow can jump to «Москва и область» in one tap.
 */
export function Header({
  nav,
  phone,
  regions,
  current,
  homeHref,
  ctaHref,
  slogan,
}: {
  nav: NavItem[]
  phone?: string | null
  regions: RegionView[]
  current?: RegionView
  homeHref: string
  ctaHref: string
  slogan?: string | null
}) {
  const path = usePathname()
  // the menu remembers the page it was opened on, so it is closed on any other page without an effect
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === path
  const setOpen = (v: boolean) => setOpenOn(v ? path : null)
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  const switcher = (
    <details className="region-switch">
      <summary>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="10" r="2.5" fill="currentColor" />
        </svg>
        {current ? current.shortName : 'Выбрать регион'}
      </summary>
      <div className="region-switch__menu">
        {regions.map((r) => (
          <a key={r.slug} href={r.href} aria-current={r.slug === current?.slug ? 'true' : undefined}>
            <b>{r.name}</b>
            <span>{r.status === 'soon' ? 'скоро' : r.tagline}</span>
          </a>
        ))}
      </div>
    </details>
  )

  return (
    <header className="header">
      <div className="container header__in">
        <Logo href={homeHref} slogan={slogan} />
        {switcher}
        <nav className="nav" aria-label="Основное меню">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="header__right">
          {phone && (
            <a className="header__phone" href={telHref(phone)}>
              {phone}
            </a>
          )}
          <Link href={ctaHref} className="btn btn--green btn--sm">
            Выбрать дом
          </Link>
          <button className="burger" aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open} onClick={() => setOpen(!open)}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
              {open ? (
                <path d="M4 4l12 12M16 4 4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        // any link closes the menu: «Посёлки» (/#estates) on the same page does not change the path
        <nav className="mobile-nav" aria-label="Мобильное меню" onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
          <p className="mobile-nav__h">Регион</p>
          {regions.map((r) => (
            <a key={r.slug} href={r.href}>
              {r.name}
              {r.status === 'soon' ? ' · скоро' : ''}
            </a>
          ))}
          {phone && (
            <a href={telHref(phone)} className="btn btn--gold">
              Позвонить {phone}
            </a>
          )}
        </nav>
      )}
    </header>
  )
}
