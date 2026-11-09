'use client'

import { useEffect, useRef } from 'react'
import { Pic } from '@/components/Pic'
import { mainHref } from '@/lib/site'

/**
 * Sketch «Ночь → рассвет одним кадром» (04.11, /preview/night): one photo, two times of day. A star falls once over the
 * night; the scroll fades the night into the morning photo. Until the night picture comes from Nano Banana, `night`
 * is left out and the night is the morning photo darkened by CSS.
 *
 * 10.11, Игорь: the first screen is pure cinema — no captions, facts or buttons over the picture. The house itself is
 * the way in: after the photo loads a warm glow breathes over it, and a click on the house zooms in and opens the
 * catalog. The header, the floating call and the mobile bar wait until the visitor scrolls past the hero (html.past-hero,
 * the same contract as HeroOpen). `facts` stays in the props for the /preview/night page, but is no longer shown.
 */
export function HeroNight({ night, nightPhone }: { night?: string; nightPhone?: string; facts?: string }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    let raf = 0
    const set = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const run = Math.max(1, r.height - innerHeight)
      const p = Math.min(1, Math.max(0, -r.top / run))
      el.style.setProperty('--p', p.toFixed(3))
      el.classList.toggle('is-day', p > 0.5)
      // the interface (header, floating call, mobile bar) appears once the night is mostly scrolled through
      root.classList.toggle('past-hero', p > 0.55)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(set)
    }
    set()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
      cancelAnimationFrame(raf)
      root.classList.remove('past-hero')
    }
  }, [])

  const enterCatalog = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // reduced motion or a modified click (new tab etc.): a plain link, no zoom detour
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('no-motion')) return
    e.preventDefault()
    const href = e.currentTarget.href
    ref.current?.classList.add('is-leaving')
    window.setTimeout(() => window.location.assign(href), 520)
  }

  return (
    <section ref={ref} className="hn">
      <h1 className="sr-only">Хороший дом — готовые кирпичные дома с участком под Краснодаром</h1>
      <div className="hn__pane">
        <div className="hn__day">
          <Pic src="/design/hero-morning.webp" phone="/design/hero-morning-phone.webp" alt="Кирпичный дом «Тип 5» утром в дымке" priority />
        </div>
        <div className={`hn__night${night ? '' : ' hn__night--css'}`} aria-hidden>
          <Pic src={night ?? '/design/hero-morning.webp'} phone={nightPhone ?? (night ? undefined : '/design/hero-morning-phone.webp')} alt="" />
          {!night && <i className="hn__windows" />}
          <i className="hn__stars" />
          <i className="hn__star" />
        </div>
        <i className="hn__scrim" aria-hidden />

        {/* the house is the «Выбрать дом» button: a breathing glow invites the click, a hover shows the label */}
        <a className="hn__house" href={mainHref('/catalog')} aria-label="Выбрать дом — перейти в каталог" onClick={enterCatalog}>
          <i aria-hidden />
          <span>Выбрать дом →</span>
        </a>
        <i className="hn__flash" aria-hidden />
      </div>
    </section>
  )
}
