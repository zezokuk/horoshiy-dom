'use client'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { f1, ringPoint, ringSlice, type Ring } from '@/lib/fan'
import { formatArea, plural } from '@/lib/format'
import type { ProjectCardData } from './ProjectCard'

export type FanProject = ProjectCardData & { href: string }

// the fan in SVG units: a half ring of photo slices opening upwards around the chosen project (reference «The Gali»)
const W = 1200
const H = 600
const CX = 600
const CY = 560
const R1 = 196 // the hub: the chosen project
const R2 = 470 // outer edge of the slices
const RL = 492 // labels
const FROM = 192 // degrees; 270 is straight up (SVG y goes down)
const TO = 348
const GAP = 1.6

const RING: Ring = { cx: CX, cy: CY, r1: R1, r2: R2 }
const rad = (a: number) => (a * Math.PI) / 180
const pt = (r: number, a: number) => ringPoint(RING, r, a)
const f = f1
const wedge = (a0: number, a1: number) => ringSlice(RING, a0, a1)

const facts = (p: ProjectCardData) =>
  [
    p.area ? `${formatArea(p.area)} м²${p.mansard ? ` + ${formatArea(p.mansard)} м² мансарда` : ''}` : '',
    p.bedrooms ? `${p.bedrooms} ${plural(p.bedrooms, 'спальня', 'спальни', 'спален')}` : '',
    p.storeys && p.storeys > 1 ? `${p.storeys} этажа` : '',
  ].filter(Boolean)

/**
 * «Выберите проект» as a fan (reference 49d13…, «The Gali»: a tower and a ring of scenes around it): the chosen project
 * sits in the hub, the others make a half ring of photo slices around it. Pointing at a slice pulls it out and turns its
 * edge and label green; a click or Enter puts it into the hub and the fan deals again. Photos load only when the fan
 * is near the screen (SVG images would otherwise all load with the page). Phones: the same fan, labels hidden — the
 * chosen project's name and facts are under the hub.
 */
export function ProjectFan({ projects, first }: { projects: FanProject[]; first?: string }) {
  const id = useId().replace(/:/g, '')
  const root = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [chosen, setChosen] = useState(() => Math.max(0, projects.findIndex((p) => p.slug === first)))
  const [deal, setDeal] = useState(0)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setReady(true), io.disconnect()), { rootMargin: '400px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const hub = projects[chosen]
  const ring = useMemo(() => projects.map((p, i) => ({ p, i })).filter((x) => x.i !== chosen), [projects, chosen])
  const step = (TO - FROM) / Math.max(1, ring.length)
  const slices = ring.map(({ p, i }, k) => {
    const a0 = FROM + k * step + GAP / 2
    const a1 = FROM + (k + 1) * step - GAP / 2
    const mid = (a0 + a1) / 2
    const [lx, ly] = pt(RL, mid)
    return { p, i, k, mid, ...wedge(a0, a1), dx: Math.cos(rad(mid)) * 16, dy: Math.sin(rad(mid)) * 16, lx, ly }
  })

  const pick = (i: number) => {
    setChosen(i)
    setDeal((d) => d + 1)
  }
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(i)
    }
  }

  if (!hub) return null
  const [hx, hy] = [CX - R1, CY - R1]
  return (
    <div className={`pf ${ready ? 'is-ready' : ''}`} ref={root}>
      <div className="pf__stage">
        <svg className="pf__svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Проекты домов">
          <defs>
            {slices.map((s) => (
              <clipPath key={s.p.slug} id={`${id}-w${s.p.slug}`}>
                <path d={s.path} />
              </clipPath>
            ))}
            <clipPath id={`${id}-hub`}>
              <circle cx={CX} cy={CY} r={R1 - 10} />
            </clipPath>
          </defs>

          <g className="pf__ring" key={deal}>
            {slices.map((s) => (
              <g
                key={s.p.slug}
                className="pf__w"
                style={{ ['--dx' as string]: `${f(s.dx)}px`, ['--dy' as string]: `${f(s.dy)}px`, ['--i' as string]: s.k }}
                role="button"
                tabIndex={0}
                aria-label={`${s.p.name}, ${facts(s.p).join(', ')} — показать в центре`}
                onClick={() => pick(s.i)}
                onKeyDown={(e) => onKey(e, s.i)}
              >
                <path className="pf__bg" d={s.path} />
                {ready && s.p.photoCard && (
                  <image
                    href={s.p.photoCard}
                    x={f(s.box.x)}
                    y={f(s.box.y)}
                    width={f(s.box.w)}
                    height={f(s.box.h)}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${id}-w${s.p.slug})`}
                  />
                )}
                <path className="pf__edge" d={s.path} />
                <text className="pf__label" x={f(s.lx)} y={f(s.ly)} textAnchor={s.mid < 262 ? 'end' : s.mid > 278 ? 'start' : 'middle'} dominantBaseline="middle">
                  {s.p.name}
                  {s.p.area ? <tspan className="pf__label-i"> · {formatArea(s.p.area)} м²</tspan> : null}
                </text>
              </g>
            ))}
          </g>

          {/* the hub: the chosen project in a circle, cut by the bottom of the stage like a rising sun */}
          <g className="pf__hub" key={`hub-${hub.slug}`}>
            <circle className="pf__hub-bg" cx={CX} cy={CY} r={R1 - 10} />
            {ready && hub.photo && (
              <image
                href={hub.photo}
                x={hx}
                y={hy + 6}
                width={R1 * 2}
                height={H - hy - 6}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${id}-hub)`}
              />
            )}
            <circle className="pf__hub-ring" cx={CX} cy={CY} r={R1 - 2} />
          </g>
        </svg>

      </div>

      <div className="pf__info" aria-live="polite">
        <b>{hub.name}</b>
        <span>{facts(hub).join(' · ')}</span>
        {hub.free > 0 && (
          <span className="pf__free">
            {hub.free} {plural(hub.free, 'дом', 'дома', 'домов')} по проекту в продаже
          </span>
        )}
        <a className="btn btn--gold" href={hub.href}>
          Смотреть проект →
        </a>
      </div>
    </div>
  )
}
