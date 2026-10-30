'use client'

import { Fragment, useRef } from 'react'
import { useScrollVar } from '@/lib/useScrollVar'

export type RoadStop = { minutes: number; estates: { name: string; href: string; to: string }[] }

// the road in a 1200×240 box: a gentle wave, the same formula for the line and for the stops that stand on it
const LEFT = 0.04
const RIGHT = 0.96
const at = (share: number) => {
  const x = (LEFT + (RIGHT - LEFT) * share) * 1200
  return { x, y: 120 + Math.sin(share * Math.PI * 3) * 46 }
}
const line = Array.from({ length: 61 }, (_, i) => {
  const { x, y } = at(i / 60)
  return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
}).join(' ')

/**
 * «Дорога» (30.10, ERA's line between Marbella and Estepona, with our own facts): the way from Krasnodar drawn by scrolling,
 * every estate stands at its real distance in minutes, and the minutes come from the estates' «рядом» in the admin.
 */
export function Road({ stops }: { stops: RoadStop[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollVar(ref, 0.8, 0.32)
  const max = Math.max(...stops.map((s) => s.minutes))
  return (
    <div className="road" ref={ref}>
      <div className="road__map">
        <svg viewBox="0 0 1200 240" preserveAspectRatio="none" fill="none" aria-hidden focusable="false">
          <path className="road__base" d={line} />
          <path className="road__line" d={line} pathLength={1} />
        </svg>
        <i className="road__rail" aria-hidden />
        <ol className="road__stops">
          <li className="road__stop road__stop--start" style={{ ['--x' as string]: 0, ['--l' as string]: `${(at(0).x / 1200) * 100}%`, ['--t' as string]: `${(at(0).y / 240) * 100}%` }}>
            <i aria-hidden />
            <div>
              <b>Краснодар</b>
            </div>
          </li>
          {stops.map((s, n) => {
            const share = s.minutes / max
            const p = at(share)
            return (
              <li
                key={s.minutes}
                className={`road__stop ${n % 2 ? 'road__stop--up' : ''} ${share > 0.8 ? 'road__stop--last' : ''}`}
                style={{ ['--x' as string]: share.toFixed(3), ['--l' as string]: `${(p.x / 1200) * 100}%`, ['--t' as string]: `${(p.y / 240) * 100}%` }}
              >
                <i aria-hidden />
                <div>
                  <b>{s.minutes} мин</b>
                  <span className="road__names">
                    {s.estates.map((e, k) => (
                      <Fragment key={e.href}>
                        {k > 0 && ' · '}
                        <a href={e.href}>{e.name}</a>
                      </Fragment>
                    ))}
                  </span>
                  <span className="road__to">до {[...new Set(s.estates.map((e) => e.to))].join(', ')}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
