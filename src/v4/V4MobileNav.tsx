'use client'

import { useEffect, useState } from 'react'

type NavItem = { href: string; label: string }

export function V4MobileNav({ nav, phone, tel }: { nav: NavItem[]; phone?: string | null; tel: string | null }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="v4-mnav">
      <button
        type="button"
        className="v4-mnav__burger"
        aria-expanded={open}
        aria-controls="v4-mobile-drawer"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>{open ? '✕' : '☰'}</span>
      </button>
      {open && (
        <div className="v4-mnav__backdrop" onClick={() => setOpen(false)}>
          <div
            id="v4-mobile-drawer"
            className="v4-mnav__drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Разделы сайта"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="v4-mnav__head">
              <span>Меню</span>
              <button type="button" aria-label="Закрыть меню" onClick={() => setOpen(false)}>✕</button>
            </div>
            <nav className="v4-mnav__links">
              {nav.map((x) => (
                <a key={x.href} href={x.href} onClick={() => setOpen(false)}>
                  {x.label}
                </a>
              ))}
            </nav>
            <div className="v4-mnav__foot">
              {phone && tel && (
                <a className="v4-mnav__tel" href={`tel:${tel}`} onClick={() => setOpen(false)}>
                  {phone}
                </a>
              )}
              <a className="v3-btn v3-btn--main v4-mnav__cta" href="#evf-form" onClick={() => setOpen(false)}>
                Записаться на показ
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
