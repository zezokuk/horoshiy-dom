'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatMillions, plural } from '@/lib/format'
import type { HouseView } from '@/lib/view'

const BUDGETS = [
  { key: 'all', label: 'Все', test: () => true },
  { key: 'b9', label: 'до 9 млн', test: (p: number) => p <= 9_000_000 },
  { key: 'b12', label: '9–12 млн', test: (p: number) => p > 9_000_000 && p <= 12_000_000 },
  { key: 'b12p', label: 'от 12 млн', test: (p: number) => p > 12_000_000 },
] as const

/**
 * Home v2, screen 5 «Дома» (Igor, 27.10: cards that roll like a film strip, swiped to the right): the free houses with
 * real prices around a centre card, the budget chips of KASKAD on top. Drag, swipe, two fingers on a trackpad, arrows or
 * the keyboard; on its own it rolls slowly while nobody touches it (30.10).
 */
export function HouseFilm({ houses, catalogHref }: { houses: HouseView[]; catalogHref: string }) {
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]['key']>('all')
  const list = useMemo(() => houses.filter((h) => BUDGETS.find((b) => b.key === budget)!.test(h.price)), [houses, budget])
  const [at, setAt] = useState(0)
  const cur = Math.min(at, Math.max(list.length - 1, 0))
  const go = (d: number) => {
    touched.current = Date.now()
    setAt((n) => Math.max(0, Math.min(list.length - 1, Math.min(n, list.length - 1) + d)))
  }
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const touched = useRef(0) // when the visitor last moved the film
  const size = useRef(list.length) // the two effects below live for the whole page, the list changes with the budget
  useEffect(() => {
    size.current = list.length
  }, [list.length])

  // two fingers on a trackpad: a sideways gesture rolls one card; a non-passive listener, or the browser swipes «back» instead
  useEffect(() => {
    const el = stage.current
    if (!el) return
    let sum = 0
    let lock = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      const now = Date.now()
      touched.current = now
      if (now < lock) return
      sum += e.deltaX
      if (Math.abs(sum) < 40) return
      const d = sum > 0 ? 1 : -1
      setAt((n) => Math.max(0, Math.min(size.current - 1, Math.min(n, size.current - 1) + d)))
      sum = 0
      lock = now + 420 // one gesture throws dozens of events: one card per gesture
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // rolls by itself only on screen, and waits for a visitor who is looking at or moving a card
  useEffect(() => {
    const el = stage.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('no-motion')) return
    let seen = false
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    const timer = window.setInterval(() => {
      const busy = Date.now() - touched.current < 9000 || el.matches(':hover') || el.contains(document.activeElement)
      if (seen && !busy && !document.hidden) setAt((n) => (Math.min(n, size.current - 1) + 1) % Math.max(size.current, 1))
    }, 4500)
    return () => {
      io.disconnect()
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div className="v2-film">
      <div className="v2-film__top">
        <div className="v2-chips" role="group" aria-label="Бюджет">
          {BUDGETS.map((b) => {
            const n = houses.filter((h) => b.test(h.price)).length
            return (
              <button key={b.key} type="button" aria-pressed={budget === b.key} disabled={!n} onClick={() => (setBudget(b.key), setAt(0))}>
                {b.label}
                <i>{n}</i>
              </button>
            )
          })}
        </div>
        <div className="v2-arrows">
          <button type="button" onClick={() => go(-1)} disabled={cur === 0} aria-label="Предыдущий дом">
            ←
          </button>
          {/* no aria-live: the film rolls by itself, and a screen reader would announce every card */}
          <span className="v2-film__count">
            {String(cur + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}
          </span>
          <button type="button" onClick={() => go(1)} disabled={cur >= list.length - 1} aria-label="Следующий дом">
            →
          </button>
        </div>
      </div>

      <div
        className="v2-film__stage"
        ref={stage}
        tabIndex={0}
        aria-roledescription="карусель"
        aria-label="Свободные дома"
        onKeyDown={(e) => (e.key === 'ArrowRight' ? go(1) : e.key === 'ArrowLeft' ? go(-1) : null)}
        onPointerDown={(e) => (drag.current = { x: e.clientX, moved: false })}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d || d.moved || Math.abs(e.clientX - d.x) < 48) return
          d.moved = true
          go(e.clientX < d.x ? 1 : -1)
        }}
        onPointerUp={() => setTimeout(() => (drag.current = null))}
        onPointerCancel={() => (drag.current = null)}
      >
        <i className="v2-film__holes" aria-hidden />
        {list.map((h, n) => {
          const o = n - cur
          if (Math.abs(o) > 3) return null
          return (
            <a
              key={h.code}
              href={h.href}
              className={`v2-frame ${o === 0 ? 'is-current' : ''}`}
              style={{ ['--o' as string]: o, ['--a' as string]: Math.abs(o) }}
              aria-hidden={o !== 0}
              tabIndex={o === 0 ? 0 : -1}
              draggable={false}
              onClick={(e) => {
                if (drag.current?.moved) return e.preventDefault()
                if (o !== 0) {
                  e.preventDefault()
                  setAt(n)
                }
              }}
            >
              <span className="v2-frame__photo" data-reveal-photo>
                {h.photo && (
                  <span className="v2-zoom" data-parallax="15">
                    <img src={h.photoCard ?? h.photo} srcSet={h.photoCard ? `${h.photoCard} 640w, ${h.photo} 1600w` : undefined} sizes="(min-width: 960px) 560px, 80vw" alt={h.title} loading="lazy" decoding="async" draggable={false} />
                  </span>
                )}
                <span className="v2-frame__estate">{h.estateName}</span>
              </span>
              <span className="v2-frame__body">
                <span className="v2-frame__title">{h.title}</span>
                <span className="v2-frame__specs">
                  {h.area.toLocaleString('ru-RU')} м²{h.mansard ? ` + ${h.mansard} м² мансарда` : ''}
                  {h.plot ? ` · участок ${h.plot}` : ''}
                  {h.bedrooms ? ` · ${h.bedrooms} ${plural(h.bedrooms, 'спальня', 'спальни', 'спален')}` : ''}
                </span>
                <span className="v2-frame__price">{formatMillions(h.price)}</span>
              </span>
            </a>
          )
        })}
        <i className="v2-film__holes v2-film__holes--bottom" aria-hidden />
      </div>

      <div className="v2-film__foot">
        <a className="btn btn--green" href={list[cur]?.href ?? catalogHref}>
          Смотреть этот дом
        </a>
        <a className="v2-link" href={catalogHref}>
          Все дома с фильтрами →
        </a>
      </div>
    </div>
  )
}
