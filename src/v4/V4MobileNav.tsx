'use client'

import { useEffect, useRef, useState } from 'react'

type NavItem = { href: string; label: string }

export function V4MobileNav({ nav, phone, tel, bookingHref }: { bookingHref: string; nav: NavItem[]; phone?: string | null; tel: string | null }) {
  const drawer = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const close = () => drawer.current?.close()

  useEffect(() => {
    const desktop = matchMedia('(min-width: 861px)')
    const resize = () => { if (desktop.matches) close() }
    desktop.addEventListener('change', resize)
    return () => desktop.removeEventListener('change', resize)
  }, [])

  return (
    <div className="v4-mnav">
      <button type="button" className="v4-mnav__burger" aria-label="Открыть меню" aria-haspopup="dialog"
        aria-expanded={open} aria-controls="v4-mobile-drawer"
        onClick={() => { drawer.current?.showModal(); setOpen(true) }}>
        <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 8h16M4 15h16" />
        </svg>
      </button>
      <dialog ref={drawer} id="v4-mobile-drawer" className="v4-mnav__drawer"
        aria-label="Разделы сайта" onClose={() => setOpen(false)} onClick={event => {
          if (event.target !== event.currentTarget) return
          const r = event.currentTarget.getBoundingClientRect()
          if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close()
        }}>
        <div className="v4-mnav__head">
          <span>Меню</span>
          <button type="button" aria-label="Закрыть меню" onClick={close}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="m5 5 14 14M19 5 5 19" /></svg>
          </button>
        </div>
        <nav className="v4-mnav__links" aria-label="Основная навигация">
          {nav.map(item => <a key={item.href} href={item.href} onClick={close}>{item.label}</a>)}
        </nav>
        <div className="v4-mnav__foot">
          {phone && tel && <a className="v4-mnav__tel" href={`tel:${tel}`} onClick={close}>{phone}</a>}
          <a className="v3-btn v3-btn--main v4-mnav__cta" href={bookingHref} onClick={close}>Записаться на показ</a>
        </div>
      </dialog>
    </div>
  )
}
