'use client'

import { useEffect } from 'react'
import { HOUSE_LINES } from '@/components/house-lines-data'
import { Pic } from '@/components/Pic'
import { HANDSHAKE } from './HeroHandshake'

// the frame is the 3:2 picture (real «Тип 5» on a canvas, surroundings by the image model, 30.10): the house stands in it at
// a known box, and the line drawing, evening light and points are all given in the house photo's pixels (1673×897) + that
// offset. The frame covers the screen by hand (v2.css), so nothing drifts apart
const W = 3000
const H = 2000
const OX = 664
const OY = 863
const PHOTO_W = 1673
const pct = (x: number, y: number) => ({ left: `${((x + OX) / W) * 100}%`, top: `${((y + OY) / H) * 100}%` })

export type HeroPoint = { x: number; y: number; title: string; text: string }

/**
 * Home v2, screen 1 (29.10, ERA Residence): «Одно рукопожатие до вашей мечты» → the house is drawn line by line in a
 * window → the real house wipes in → the window opens to the whole screen and the header waits until the visitor
 * scrolls. Scrolling pushes the camera in, and the sun keeps playing through the leaves over the whole picture.
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
    <section className="h6-pin" aria-label="Хороший дом">
    <div className="h6">
      <div className="h6__pane">
        <div className="h6__scene">
          <div className="h6__frame">
            <div className="h6__real">
              <Pic src="/design/hero-day.webp" alt="Кирпичный дом «Хорошего дома» по проекту «Тип 5» на участке с газоном" priority />
            </div>
            <svg className="h6__sketch" viewBox={`${-OX} ${-OY} ${W} ${H}`} fill="none" aria-hidden focusable="false">
              {(['fence', 'wall', 'roof', 'hatch'] as const).map((g) => (
                <g key={g} className={`hl-${g}`}>
                  {HOUSE_LINES[g].map((p) => (
                    <polyline key={p} points={p} pathLength={1} />
                  ))}
                </g>
              ))}
            </svg>
            <div className="h6__points">
              {points.map((p) => (
                // a point on the right half puts its label to the left, so it never runs off the screen
                <span key={p.title} className={`h6__point ${p.x > PHOTO_W * 0.6 ? 'h6__point--left' : ''}`} style={pct(p.x, p.y)}>
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

      {/* the living light (Ilya, 30.10: not day and night, but the sun through leaves in the wind) */}
      <div className="h6__light" aria-hidden>
        <i className="h6__rays" />
        <i className="h6__sun" />
        <i className="h6__dapple" />
      </div>

      <div className="h6__veil" aria-hidden />

      <div className="h6__copy">
        <p className="h6__eyebrow">Строим и продаём дома{since ? ` с ${since} года` : ''}</p>
        <h1 className="h6__title">Хороший дом</h1>
        <p className="h6__slogan">сюда приводят мечты</p>
      </div>

      <p className="h6__note">Дом настоящий, окружение — визуализация</p>

      <div className="h6__bar">
        <p className="h6__lead">{lead}</p>
        <div className="h6__actions">
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
    </div>
    </section>
  )
}
