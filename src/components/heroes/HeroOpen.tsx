'use client'

import { useEffect, useRef } from 'react'
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

// «Утро»: the roof's ridge on the house, the tip of the author's rod, and where the ridge hangs before the scroll (under
// the rod, the roof at 0.3 of its size); all in the photo's pixels, as the sketch
const RIDGE = [1010, 235] as const
const ROD_TIP = [1660, -610] as const
const HANG = [1660, -470] as const
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ease = (t: number) => t * t * (3 - 2 * t)
/** where the ridge is at build progress `b` (0 under the rod, 1 on the house), plus `drop` paid out on the line */
const ridgeAt = (b: number, drop: number) => {
  const e = ease(b)
  return [HANG[0] + (RIDGE[0] - HANG[0]) * e, HANG[1] + (RIDGE[1] - HANG[1]) * e + drop * (1 - e)] as const
}
const liftAt = (b: number, drop: number) => {
  const [x, y] = ridgeAt(b, drop)
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.3 + 0.7 * ease(b)).toFixed(3)}) translate(${-RIDGE[0]} ${-RIDGE[1]})`
}

/**
 * Home v2, screen 1 (29.10, ERA Residence): «Одно рукопожатие до вашей мечты» → the house is drawn line by line in a
 * window → the real house wipes in → the window opens to the whole screen and the header waits until the visitor
 * scrolls. Scrolling pushes the camera in, and the sun keeps playing through the leaves over the whole picture.
 *
 * `morning` (default; 03.11, «мечта в облаках → утро», 39-…): the intro plays in the clouds — the handshake, the house
 * drawn over the dawn sky — then the clouds settle into a bank below and cover the drawing; «Выбрать дом» is there from
 * the start. The first screen of scrolling is the sunrise: the clouds part to the sides, the morning photo comes through,
 * the sun climbs from behind the bank to the sun of the picture, one soft glare at 0.6–0.8. Scrolling only feeds `--p`
 * (0→1), `--flare` and two classes to CSS (v2.css: .h6-pin--morning)
 */
export function HeroOpen({
  since,
  lead,
  points,
  catalogHref,
  morning = true,
}: {
  since?: number | null
  lead: string
  points: HeroPoint[]
  catalogHref: string
  morning?: boolean
}) {
  const pinRef = useRef<HTMLElement>(null)
  // the header stays away while the house fills the screen: CSS hides it from the first paint (html:has(.h6)), this
  // only marks the moment the visitor has scrolled past the house (v2.css: html.past-hero)
  useEffect(() => {
    const root = document.documentElement
    const pin = pinRef.current
    const lift = pin?.querySelector<SVGGElement>('.h6__lift')
    const rope = pin?.querySelector<SVGLineElement>('.h6__rope')
    const born = performance.now()
    let frame = 0
    let idle = 0
    let build = 0
    // the roof on the line: before any scroll the line pays out a little and the roof sways on it — the invitation to
    // scroll (ERA); the scroll then brings it down onto the walls
    const drawRoof = (now: number) => {
      if (!lift || !rope) return
      const t = (now - born) / 1000
      const drop = 80 * ease(clamp((t - 0.9) / 0.9)) + (t > 1.8 ? 7 * Math.sin((t - 1.8) * 2.2) : 0)
      const [x, y] = ridgeAt(build, drop)
      lift.setAttribute('transform', liftAt(build, drop))
      rope.setAttribute('x2', x.toFixed(1))
      rope.setAttribute('y2', y.toFixed(1))
    }
    // «reduce motion»: no story, the morning house at once (v2.css); no sway either where the drawing is not shown (phones)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('no-motion')
    const still = calm || window.matchMedia('(max-aspect-ratio: 1/1)').matches
    const tease = (now: number) => {
      idle = 0
      drawRoof(now)
      if (build === 0 && !still) idle = requestAnimationFrame(tease)
    }
    const sync = () => {
      frame = 0
      // the story takes the pinned part of the scroll (two screens on a computer); not pinned (reduced motion) — 0.6 screen
      const span = Math.max((pin?.offsetHeight ?? 0) - window.innerHeight, window.innerHeight * 0.6)
      const p = Math.min(1, Math.max(0, window.scrollY / span))
      if (morning && pin) {
        // one scroll, four acts: the house is built in the night, the dawn, the clouds part, the sun climbs
        build = clamp(p / 0.25)
        const dawn = clamp((p - 0.24) / 0.14)
        const part = clamp((p - 0.36) / 0.28)
        const s = pin.style
        s.setProperty('--p', p.toFixed(3))
        s.setProperty('--wall', clamp(build / 0.6).toFixed(3))
        s.setProperty('--hatch', clamp((build - 0.85) / 0.15).toFixed(3))
        s.setProperty('--dawn', dawn.toFixed(3))
        s.setProperty('--part', part.toFixed(3))
        s.setProperty('--rise', clamp((p - 0.4) / 0.3).toFixed(3))
        // one soft hump over 0.74–0.9: rises and falls once, follows the scroll, so it never blinks by itself
        s.setProperty('--flare', p > 0.74 && p < 0.9 ? Math.sin(((p - 0.74) / 0.16) * Math.PI).toFixed(3) : '0')
        pin.classList.toggle('is-building', build > 0)
        // the words: warm white on the night, dark over the cloud bank at dawn, white over the lawn on the shade
        pin.classList.toggle('is-day', calm || dawn > 0.5)
        pin.classList.toggle('is-clear', calm || part > 0.5)
        drawRoof(performance.now())
        if (build === 0 && !idle && !still) idle = requestAnimationFrame(tease)
      }
      // the header and the floating call come once the house starts leaving (as before: 0.1 screen past the pin), so
      // they never cover «Выбрать дом» while the dawn plays
      root.classList.toggle('past-hero', window.scrollY > (morning ? span : window.innerHeight * 0.5) + window.innerHeight * 0.1)
    }
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(sync)
    }
    sync()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(idle)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      root.classList.remove('past-hero')
    }
  }, [morning])

  return (
    <section ref={pinRef} className={`h6-pin${morning ? ' h6-pin--morning' : ''}`} aria-label="Хороший дом">
    <div className="h6">
      <div className="h6__pane">
        {/* the night the dream is built in: stars, then the dawn takes over (v2.css) */}
        {morning && <i className="h6__night" aria-hidden />}
        {/* a falling star — the wish — lands where the house starts being drawn */}
        {morning && <i className="h6__star" aria-hidden />}
        <div className="h6__scene">
          <div className="h6__frame">
            <div className="h6__real">
              {morning ? (
                // the same frame in the morning haze (Weave, 03.11): the house stands where it stood, so the sketch and the points still fit
                <Pic
                  src="/design/hero-morning.webp"
                  phone="/design/hero-morning-phone.webp"
                  alt="Кирпичный дом «Хорошего дома» по проекту «Тип 5» ранним утром, солнце сквозь листву и дымка над полем"
                  priority
                />
              ) : (
                <Pic src="/design/hero-day.webp" alt="Кирпичный дом «Хорошего дома» по проекту «Тип 5» на участке с газоном" priority />
              )}
            </div>
            <svg className="h6__sketch" viewBox={`${-OX} ${-OY} ${W} ${H}`} fill="none" aria-hidden focusable="false">
              {/* the author on the moon (Ilya, 03.11, after Shrek's opening): a man in gold line sits in the crescent and
                  fishes the roof down onto the house on a line. Our own figure, not the DreamWorks boy; drop this <g> to
                  go without him. The line runs from the rod's tip (ROD_TIP) to the ridge, HeroOpen moves its lower end */}
              {morning && (
                <g className="h6__sky">
                  <path className="h6__moon" d="M1820,-710 A170,170 0 1,1 1860,-390 A205,205 0 0,0 1820,-710 Z" />
                  <g className="h6__fisher">
                    <circle cx={1883} cy={-550} r={19} />
                    <polyline points="1886,-530 1895,-440 1846,-438 1840,-388" />
                    <polyline points="1887,-512 1842,-478" />
                    <polyline points={`1842,-478 ${ROD_TIP.join(',')}`} />
                  </g>
                  <line className="h6__rope" x1={ROD_TIP[0]} y1={ROD_TIP[1]} x2={ROD_TIP[0]} y2={ROD_TIP[1] + 140} />
                </g>
              )}
              {(['fence', 'wall', 'roof', 'hatch'] as const).map((g) => {
                const lines = (
                  <g key={g} className={`hl-${g}`}>
                    {HOUSE_LINES[g].map((p) => (
                      <polyline key={p} points={p} pathLength={1} />
                    ))}
                  </g>
                )
                // the roof hangs on the line under the rod, small; the scroll brings it down onto the walls (liftAt)
                return morning && g === 'roof' ? (
                  <g key={g} className="h6__lift" transform={liftAt(0, 0)}>
                    {lines}
                  </g>
                ) : (
                  lines
                )
              })}
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
        <i className="h6__rise">
          <i className="h6__rays" />
          <i className="h6__sun" />
        </i>
        <i className="h6__dapple" />
        {morning && <i className="h6__flare" />}
      </div>

      <div className="h6__veil" aria-hidden />

      {/* the dream in the clouds: they fill the screen during the intro, settle into a bank below and part to the sides
          on scrolling, over the sun, so it rises from behind them (clouds.webp: Weave, alpha made from the black) */}
      {morning && (
        <div className="h6__clouds" aria-hidden>
          <i className="h6__cloud h6__cloud--back" />
          <i className="h6__cloud h6__cloud--left" />
          <i className="h6__cloud h6__cloud--right" />
        </div>
      )}

      <div className="h6__copy">
        <p className="h6__eyebrow">Строим и продаём дома{since ? ` с ${since} года` : ''}</p>
        <h1 className="h6__title">Хороший дом</h1>
        <p className="h6__slogan">сюда приводят мечты</p>
      </div>

      {morning && (
        <p className="h6__hint" aria-hidden>
          <span>Листайте — история начинается</span>
          <i>↓</i>
        </p>
      )}

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
