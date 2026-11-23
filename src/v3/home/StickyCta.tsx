'use client'

/**
 * v3 · липкая кнопка на телефоне (05-Концепция, «Главная»): появляется, когда первый экран ушёл вверх, и прячется,
 * когда на экране сама форма записи (#pokaz) — чтобы не дублировать её. На компьютере не показывается (CSS).
 */
import { useEffect, useState } from 'react'

export function StickyCta({ phone }: { phone?: string | null }) {
  const [on, setOn] = useState(false)

  // a plain scroll check, not IntersectionObserver: an edge-touching hero still counts as «intersecting», and the
  // evening finale is a tall scene, so a ratio threshold on it never fires (both caught by the browser test, 12.11)
  useEffect(() => {
    const hero = document.querySelector('.fh#doma') ?? document.querySelector('.v3-hero, .v3-hero2, .hn, .v4-dom, .v4-page-head')
    const form = document.querySelector('#pokaz form') ?? document.getElementById('pokaz')
    if (!hero || !form) return
    let raf = 0
    const check = () => {
      raf = 0
      const h = hero.getBoundingClientRect()
      const f = form.getBoundingClientRect()
      const pastHero = h.bottom < innerHeight * 0.35
      const formOnScreen = f.top < innerHeight && f.bottom > 0
      setOn(pastHero && !formOnScreen)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check) }
    // every «Записаться на показ» link: centre the form, then correct once more — images and the 3D block above it
    // finish loading after the jump and push the form down (caught by the browser test on 390 px, 12.11)
    let fix = 0
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href="#evf-form"]')
      const target = document.getElementById('evf-form')
      if (!a || !target) return
      e.preventDefault()
      // instant on purpose: the global `scroll-behavior: smooth` gets cut short on a 10 000 px jump (stopped ~1 500 px
      // above the form in the test); after «Записаться» the person wants the form now, not a fly-through
      target.scrollIntoView({ block: 'center', behavior: 'instant' })
      clearTimeout(fix)
      fix = window.setTimeout(() => {
        const r = target.getBoundingClientRect()
        if (r.top < 0 || r.bottom > innerHeight) target.scrollIntoView({ block: 'center', behavior: 'instant' })
      }, 500)
      history.replaceState(null, '', '#evf-form')
    }
    check()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    document.addEventListener('click', onClick)
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); document.removeEventListener('click', onClick); clearTimeout(fix); if (raf) cancelAnimationFrame(raf) }
  }, [])

  const tel = phone?.replace(/[^\d+]/g, '')
  return (
    <div className="v3-sticky" data-on={on ? 'true' : 'false'} aria-hidden={!on}>
      {tel && (
        <a className="v3-sticky__tel" href={`tel:${tel}`} aria-label={`Позвонить: ${phone}`} tabIndex={on ? 0 : -1}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z" /></svg>
        </a>
      )}
      <a className="v3-btn v3-btn--main v3-sticky__go" href="#evf-form" tabIndex={on ? 0 : -1}>Записаться на показ</a>
    </div>
  )
}
