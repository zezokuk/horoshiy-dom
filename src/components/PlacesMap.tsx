'use client'

import type { EstateView } from '@/lib/view'

// the city the estates are measured from (its centre, Красная площадь); the estates' own points come from the admin
const CITY = { name: 'Краснодар', lat: 45.0355, lng: 38.9753 }
const W = 600
const H = 380
const PAD = 54
const NEAR = 0.02 // degrees (~2 km): estates closer than this share one point

type Spot = { x: number; y: number; names: string[]; slugs: string[]; href: string; kind: 'free' | 'soon' | 'sold' }

/** A schematic map from real coordinates: no invented roads or rivers. */
export function PlacesMap({
  estates,
  activeSlug,
  onActivate,
}: {
  estates: EstateView[]
  activeSlug?: string
  onActivate?: (slug: string) => void
}) {
  const placed = estates.filter((e) => e.lat != null && e.lng != null && Math.abs(e.lat - CITY.lat) < 1 && Math.abs(e.lng - CITY.lng) < 1.4)
  if (placed.length < 2) return null
  const lats = [CITY.lat, ...placed.map((e) => e.lat!)]
  const lngs = [CITY.lng, ...placed.map((e) => e.lng!)]
  const k = Math.cos((CITY.lat * Math.PI) / 180)
  const [la0, la1, ln0, ln1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  const scale = Math.min((W - 2 * PAD) / ((ln1 - ln0) * k || 1), (H - 2 * PAD) / (la1 - la0 || 1))
  const ox = (W - (ln1 - ln0) * k * scale) / 2
  const oy = (H - (la1 - la0) * scale) / 2
  const at = (lat: number, lng: number) => ({ x: ox + (lng - ln0) * k * scale, y: H - oy - (lat - la0) * scale })

  const spots: (Spot & { lat: number; lng: number })[] = []
  for (const e of placed) {
    const kind = e.status === 'planned' ? 'soon' : e.free ? 'free' : 'sold'
    const near = spots.find((s) => Math.hypot(s.lat - e.lat!, (s.lng - e.lng!) * k) < NEAR)
    if (near) {
      near.names.push(e.name)
      near.slugs.push(e.slug)
      if (kind === 'free') near.kind = 'free'
      continue
    }
    spots.push({ ...at(e.lat!, e.lng!), lat: e.lat!, lng: e.lng!, names: [e.name], slugs: [e.slug], href: e.href, kind })
  }
  const city = at(CITY.lat, CITY.lng)
  const km10 = (10 / 111) * scale

  return (
    <svg className="pmap" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Схема: ${CITY.name} и наши посёлки`}>
      <defs>
        <pattern id="pmap-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0H0V30" className="pmap__grid" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#pmap-grid)" />
      <circle className="pmap__ring" cx={city.x} cy={city.y} r={km10} />
      <circle className="pmap__ring" cx={city.x} cy={city.y} r={km10 * 2} />
      {spots.map((s) => (
        <line key={`l${s.names[0]}`} x1={city.x} y1={city.y} x2={s.x} y2={s.y} className="pmap__ray" />
      ))}
      <g className="pmap__city">
        <circle cx={city.x} cy={city.y} r="22" />
        <circle cx={city.x} cy={city.y} r="5" />
        <text x={city.x} y={city.y - 32} textAnchor="middle">
          {CITY.name}
        </text>
      </g>
      {spots.map((s) => {
        const left = s.x > W * 0.62 || (s.x < city.x && Math.abs(s.y - city.y) < 40)
        const active = activeSlug ? s.slugs.includes(activeSlug) : false
        return (
          <a
            key={s.names[0]}
            href={s.href}
            className={`pmap__spot is-${s.kind} ${active ? 'is-active' : ''}`}
            aria-current={active ? 'location' : undefined}
            onMouseEnter={() => onActivate?.(s.slugs[0])}
            onFocus={() => onActivate?.(s.slugs[0])}
          >
            {active && <circle className="pmap__active-ring" cx={s.x} cy={s.y} r="15" />}
            <circle cx={s.x} cy={s.y} r="8" />
            <text x={s.x + (left ? -16 : 16)} y={s.y} textAnchor={left ? 'end' : 'start'}>
              {s.names.map((n, i) => (
                <tspan key={n} x={s.x + (left ? -16 : 16)} dy={i ? '1.15em' : `${0.35 - (s.names.length - 1) * 0.575}em`}>
                  {n}
                </tspan>
              ))}
            </text>
          </a>
        )
      })}
      <g className="pmap__scale" transform={`translate(${W - PAD - km10} ${H - 22})`}>
        <path d={`M0 -5V0H${km10.toFixed(1)}V-5`} />
        <text x={km10 / 2} y="-9" textAnchor="middle">
          10 км
        </text>
      </g>
      <text className="pmap__north" x={PAD - 30} y={PAD - 22}>
        ↑ север
      </text>
    </svg>
  )
}
