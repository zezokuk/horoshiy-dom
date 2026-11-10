'use client'

import { useEffect, useRef, useState } from 'react'
import { Pic } from '@/components/Pic'
import { mainHref } from '@/lib/site'

export type HeroSlide = { title: string; meta: string; src: string; href: string }

/**
 * «Ночь → рассвет одним кадром» (04.11): one photo, two times of day. A star falls once over the night; the scroll
 * fades the night into the morning photo. Until the night picture comes from ChatGPT, `night` is left out and the
 * night is the morning photo darkened by CSS.
 *
 * 10.11, Игорь: the first screen is pure cinema — no facts or buttons over the picture. The house itself is the way in:
 * a click on it zooms in and opens the catalog. The header, the floating call, the cookie notice and the mobile bar
 * wait until the visitor scrolls past the hero (html.past-hero).
 *
 * 10.11, evening (Игорь's two notes, done by Claude for Илья):
 * - the dawn comes by itself: a visitor who does nothing for a few seconds still sees the night turn into morning;
 * - once it is day, the same screen is a slider of our house types (`slides`, real photos from the admin): arrows,
 *   swipe, dots, slow autoplay. The house stays the button — it opens the type that is on the screen.
 */
const AUTO_DELAY = 5200 // the star has fallen and the windows are lit by then
const AUTO_MS = 3400
const SLIDE_MS = 6000

export function HeroNight({ night, nightPhone, slides = [] }: { night?: string; nightPhone?: string; facts?: string; slides?: HeroSlide[] }) {
  const ref = useRef<HTMLElement>(null)
  const [day, setDay] = useState(false)
  // 0 — the cinema frame itself («Тип 5» in the morning mist), then the types
  const [idx, setIdx] = useState(0)
  const [hold, setHold] = useState(false) // the visitor took the slider over: autoplay stops
  const count = slides.length + 1

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('no-motion')
    let raf = 0
    let auto = 0 // the dawn that comes by itself, 0…1; the scroll can only add to it
    let autoRaf = 0
    const set = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const run = Math.max(1, r.height - innerHeight)
      const scrolled = Math.min(1, Math.max(0, -r.top / run))
      const p = Math.max(scrolled, auto)
      el.style.setProperty('--p', p.toFixed(3))

      setDay(p > 0.5)
      // the interface (header, floating call, mobile bar) appears only once the visitor scrolls: the dawn alone keeps the cinema
      root.classList.toggle('past-hero', scrolled > 0.55)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(set)
    }
    const timer = window.setTimeout(() => {
      if (reduce) {
        auto = 1
        return set()
      }
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / AUTO_MS)
        auto = k * k * (3 - 2 * k) // ease in and out
        set()
        if (k < 1) autoRaf = requestAnimationFrame(step)
      }
      autoRaf = requestAnimationFrame(step)
    }, AUTO_DELAY)
    set()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
      cancelAnimationFrame(raf)
      cancelAnimationFrame(autoRaf)
      clearTimeout(timer)
      root.classList.remove('past-hero')
    }
  }, [])

  // slow autoplay by day, until the visitor touches the slider or scrolls the hero away
  useEffect(() => {
    if (!day || hold || count < 2) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => {
      const r = ref.current?.getBoundingClientRect()
      if (r && r.bottom > innerHeight * 0.6 && !document.hidden) setIdx((i) => (i + 1) % count)
    }, SLIDE_MS)
    return () => clearInterval(t)
  }, [day, hold, count])

  const go = (step: number) => {
    setHold(true)
    setIdx((i) => (i + step + count) % count)
  }
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s || !day || count < 2) return
    const dx = e.changedTouches[0].clientX - s.x
    const dy = e.changedTouches[0].clientY - s.y
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1)
  }

  const enter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // reduced motion or a modified click (new tab etc.): a plain link, no zoom detour
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('no-motion')) return
    e.preventDefault()
    const href = e.currentTarget.href
    ref.current?.classList.add('is-leaving')
    window.setTimeout(() => window.location.assign(href), 520)
  }

  const slide = day && idx > 0 ? slides[idx - 1] : null
  const href = slide ? slide.href : mainHref('/catalog')
  const label = slide ? `${slide.title} · ${slide.meta}` : 'Выбрать дом'

  return (
    <section ref={ref} className={`hn${day ? ' is-day' : ''}${slide ? ' is-slide' : ''}`}>
      <div className="hn__pane" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="hn__day">
          <Pic src="/design/hero-morning.webp" phone="/design/hero-morning-phone.webp" alt="Кирпичный дом «Тип 5» утром в дымке" priority />
        </div>
        {/* the types: real photos, loaded only when the day has come, so the night stays light */}
        {day && slides.length > 0 && (
          <div className="hn__slides" aria-hidden={!slide}>
            {slides.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- the admin's own resized webp, as in Pic
              <img key={s.href} className={i === idx - 1 ? 'is-on' : ''} src={s.src} alt={i === idx - 1 ? `Дом по проекту «${s.title}»` : ''} decoding="async" />
            ))}
          </div>
        )}
        <div className={`hn__night${night ? '' : ' hn__night--css'}`} aria-hidden>
          <Pic src={night ?? '/design/hero-morning.webp'} phone={nightPhone ?? (night ? undefined : '/design/hero-morning-phone.webp')} alt="" />
          {!night && <i className="hn__windows" />}
          <i className="hn__stars" />
          <i className="hn__star" />
        </div>
        <i className="hn__scrim" aria-hidden />

        <div className="hn__copy">
          <h1 className="hn__title">Хороший дом</h1>
          <p className="hn__slogan">сюда приводят мечты</p>
        </div>

        {/* the house is the button: it opens the catalog, or the type that is on the screen */}
        <a className="hn__house" href={href} aria-label={slide ? `${label} — открыть проект` : 'Выбрать дом — перейти в каталог'} onClick={enter}>
          <span key={idx}>{label} →</span>
        </a>

        {count > 1 && (
          <div className="hn__nav" aria-hidden={!day}>
            <button type="button" className="hn__arrow hn__arrow--prev" onClick={() => go(-1)} aria-label="Предыдущий дом" tabIndex={day ? 0 : -1}>
              ←
            </button>
            <button type="button" className="hn__arrow hn__arrow--next" onClick={() => go(1)} aria-label="Следующий дом" tabIndex={day ? 0 : -1}>
              →
            </button>
            <div className="hn__dots">
              {Array.from({ length: count }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-current={i === idx}
                  aria-label={i === 0 ? 'Первый кадр' : slides[i - 1].title}
                  className={i === idx ? 'is-on' : ''}
                  tabIndex={day ? 0 : -1}
                  onClick={() => {
                    setHold(true)
                    setIdx(i)
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <i className="hn__swipe" aria-hidden><b /></i>
        <i className="hn__flash" aria-hidden />
      </div>
    </section>
  )
}
