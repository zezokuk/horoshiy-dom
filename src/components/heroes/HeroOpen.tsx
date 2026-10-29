'use client'

import { useEffect, useState } from 'react'
import { HOUSE_LINES } from '@/components/house-lines-data'
import { Pic } from '@/components/Pic'
import { HANDSHAKE } from './HeroHandshake'

// the frame is the photo's own box (tools/heroassets.py: «Тип 5», 1673×897): photo, line drawing, evening light and the
// points all sit in it in photo pixels, and the frame covers the screen by hand (v2.css), so nothing drifts apart
const W = 1673
const H = 897
const pct = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })
const box = (x: number, y: number, w: number, h: number) => ({ ...pct(x, y), width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` })

// warm light in the glass of the real photo (photo pixels): two windows, the narrow one by the porch, the door's transom
const WINDOWS = [box(282, 532, 76, 182), box(1143, 512, 166, 212), box(584, 526, 32, 90), box(808, 528, 100, 30)]
// garden lights along the fence and over the door: «вечерние огни на участке» from the client's own text
const LAMPS = [pct(858, 556), pct(330, 842), pct(640, 850), pct(1050, 846), pct(1420, 842)]

export type HeroPoint = { x: number; y: number; title: string; text: string }

/**
 * Home v2, screen 1 (29.10, ERA Residence): «Одно рукопожатие до вашей мечты» → the house is drawn line by line in a
 * window → the real house wipes in → the window opens to the whole screen and the header waits until the visitor
 * scrolls. Scrolling pushes the camera in. «День / вечер» swaps the light on the same frame.
 */
export function HeroOpen({
  since,
  lead,
  points,
  catalogHref,
}: {
  since?: number | null
  lead: string
  points: HeroPoint[]
  catalogHref: string
}) {
  const [time, setTime] = useState<'day' | 'night'>('day')

  // the header stays away while the house fills the screen: CSS hides it from the first paint (html:has(.h6)), this
  // only marks the moment the visitor has scrolled past the house (v2.css: html.past-hero)
  useEffect(() => {
    const root = document.documentElement
    const sync = () => root.classList.toggle('past-hero', window.scrollY > window.innerHeight * 0.6)
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      root.classList.remove('past-hero')
    }
  }, [])

  return (
    <section className="h6" data-time={time} aria-label="Хороший дом">
      <div className="h6__pane">
        <div className="h6__scene">
          <div className="h6__frame">
            <div className="h6__real">
              <Pic src="/design/hero1-photo.webp" phone="/design/hero1-photo-900.webp" alt="Кирпичный дом «Хорошего дома» по проекту «Тип 5»" priority />
            </div>
            <svg className="h6__sketch" viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden focusable="false">
              {(['fence', 'wall', 'roof', 'hatch'] as const).map((g) => (
                <g key={g} className={`hl-${g}`}>
                  {HOUSE_LINES[g].map((p) => (
                    <polyline key={p} points={p} pathLength={1} />
                  ))}
                </g>
              ))}
            </svg>
            <div className="h6__night" aria-hidden>
              {WINDOWS.map((s, i) => (
                <i key={i} className="h6__glow" style={s} />
              ))}
              {LAMPS.map((s, i) => (
                <i key={i} className="h6__lamp" style={s} />
              ))}
            </div>
            <div className="h6__points">
              {points.map((p) => (
                // a point on the right half puts its label to the left, so it never runs off the screen
                <span key={p.title} className={`h6__point ${p.x > W * 0.6 ? 'h6__point--left' : ''}`} style={pct(p.x, p.y)}>
                  <i aria-hidden />
                  <span>
                    <b>{p.title}</b>
                    {p.text}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h6__veil" aria-hidden />

      <div className="h6__copy">
        <p className="h6__eyebrow">Строим и продаём дома{since ? ` с ${since} года` : ''}</p>
        <h1 className="h6__title">Хороший дом</h1>
        <p className="h6__slogan">сюда приводят мечты</p>
      </div>

      <p className="h6__note">Фото построенного дома{time === 'night' ? ' · вечер — иллюстрация' : ''}</p>

      <div className="h6__bar">
        <p className="h6__lead">{lead}</p>
        <div className="h6__actions">
          <div className="h6__time" role="group" aria-label="Время суток">
            <button type="button" aria-pressed={time === 'day'} onClick={() => setTime('day')}>
              День
            </button>
            <button type="button" aria-pressed={time === 'night'} onClick={() => setTime('night')}>
              Вечер
            </button>
          </div>
          <a className="btn btn--light" href={catalogHref}>
            Выбрать дом
          </a>
          <a className="h6__down" href="#next">
            <i aria-hidden>↓</i>
          </a>
        </div>
      </div>

      <div className="h6__intro" aria-hidden>
        <p className="h6__intro-eyebrow">Хороший дом{since ? ` · с ${since} года` : ''}</p>
        <p className="h6__intro-title">
          <span>Одно рукопожатие</span>
          <span>
            до вашей <em>мечты</em>
          </span>
        </p>
        <div className="h6__deal">
          <svg viewBox="0 0 24 24" fill="none" focusable="false">
            {HANDSHAKE.map((d) => (
              <path key={d} d={d} pathLength={1} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        </div>
      </div>
    </section>
  )
}
