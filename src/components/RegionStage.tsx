import type { ReactNode } from 'react'
import { f1, ringPoint, ringSlice, type Ring } from '@/lib/fan'
import { softHyphens } from '@/lib/format'
import { estateSale, type EstateView } from '@/lib/view'

export type StageEstate = EstateView & { photo?: string }

// the scheme in SVG units: our house stands in the middle, under it a half ring of the region's estates opening downwards
const W = 1200
const H = 740
const RING: Ring = { cx: 600, cy: 235, r1: 150, r2: 440 }
const RL = 462 // labels: far enough in from the sides for «Нововеличковская» and «продан · 34 дома»
const FROM = 14 // degrees: 0 is to the right, 90 straight down, 180 to the left
const TO = 166
const GAP = 1.4
// the cut-out photo of «Тип 5» (public/design, made by tools/heroassets.py): 1673×897, the house starts 233 px down.
// It stands inside the ring (its bottom fades out over the inner arc), like the tower in the reference
const HOUSE = { w: 720, h: (720 * 897) / 1673, sink: 105 }

/**
 * The region's first screen (Илья, 20.10, reference 49d13… «The Gali»: a tower and a ring of scenes around it).
 * Ours: the house in the middle and the region's estates around it as slices of real photos — each a link to its estate,
 * labelled with what can be bought there. No JS: the slices pull out on pointing with CSS. Phones: the labels would be
 * too small, so the estates are listed under the fan instead.
 * When the generated key visual from Промты/lark/первый-экран-регион-остров.md (v2) is approved, it can replace the house.
 */
export function RegionStage({
  name,
  tagline,
  estates,
  facts,
  actions,
  note,
}: {
  name: string
  tagline?: string | null
  estates: StageEstate[]
  facts: { value: string; label: string }[]
  actions: ReactNode
  note?: string | null
}) {
  const n = estates.length
  const step = (TO - FROM) / Math.max(1, n)
  // left to right in the admin's order (the caller sorts: on sale first)
  const slices = estates.map((e, k) => {
    const a1 = TO - k * step - GAP / 2
    const a0 = TO - (k + 1) * step + GAP / 2
    const mid = (a0 + a1) / 2
    const [lx, ly] = ringPoint(RING, RL, mid)
    const side: 'start' | 'end' | 'middle' = mid < 75 ? 'start' : mid > 105 ? 'end' : 'middle'
    const [cx, cy] = ringPoint(RING, (RING.r1 + RING.r2) / 2, mid)
    return { e, k, mid, side, lx, ly, cx, cy, ...ringSlice(RING, a0, a1), dx: Math.cos((mid * Math.PI) / 180) * 14, dy: Math.sin((mid * Math.PI) / 180) * 14 }
  })

  return (
    <section className="rs" aria-labelledby="rs-title">
      <p className="rs__eyebrow">Регион</p>
      <h1 className="rs__title" id="rs-title">
        {name}
      </h1>
      {tagline && <p className="rs__tag">{tagline}</p>}

      {n > 0 && (
        <svg className="rs__svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Посёлки: ${estates.map((e) => e.name).join(', ')}`}>
          <defs>
            <radialGradient id="rs-glow">
              <stop offset="0" stopColor="#b0915f" stopOpacity=".42" />
              <stop offset=".55" stopColor="#b0915f" stopOpacity=".1" />
              <stop offset="1" stopColor="#b0915f" stopOpacity="0" />
            </radialGradient>
            {/* the photo is a rectangle: its bottom and sides melt into the stage */}
            <linearGradient id="rs-fade-v" x1="0" y1="0" x2="0" y2="1">
              <stop offset=".7" stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rs-fade-h" x1="0" y1="0" x2="1" y2="0">
              <stop offset=".1" stopColor="#fff" stopOpacity="0" />
              <stop offset=".24" stopColor="#fff" />
              <stop offset=".86" stopColor="#fff" />
              <stop offset=".98" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="rs-mask-v" maskContentUnits="objectBoundingBox">
              <rect width="1" height="1" fill="url(#rs-fade-v)" />
            </mask>
            <mask id="rs-mask-h" maskContentUnits="objectBoundingBox">
              <rect width="1" height="1" fill="url(#rs-fade-h)" />
            </mask>
            <pattern id="rs-grid" width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M22 0H0V22" fill="none" stroke="#b0915f" strokeOpacity=".28" />
            </pattern>
            {slices.map((s) => (
              <clipPath key={s.e.slug} id={`rs-w-${s.e.slug}`}>
                <path d={s.path} />
              </clipPath>
            ))}
          </defs>

          <circle cx={RING.cx} cy={RING.cy - 30} r={RING.r2 * 0.8} fill="url(#rs-glow)" />

          {slices.map((s) => (
            <a
              key={s.e.slug}
              href={s.e.href}
              className={`rs__w is-${s.e.status === 'planned' ? 'soon' : s.e.free ? 'free' : 'sold'}`}
              style={{ ['--dx' as string]: `${f1(s.dx)}px`, ['--dy' as string]: `${f1(s.dy)}px`, ['--i' as string]: s.k }}
              aria-label={`${s.e.name}: ${estateSale(s.e).toLowerCase()}`}
            >
              <path className="rs__bg" d={s.path} fill={s.e.photo ? undefined : 'url(#rs-grid)'} />
              {s.e.photo ? (
                <image
                  href={s.e.photo}
                  x={f1(s.box.x)}
                  y={f1(s.box.y)}
                  width={f1(s.box.w)}
                  height={f1(s.box.h)}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#rs-w-${s.e.slug})`}
                />
              ) : (
                // no photo yet: the gold grid; «скоро» only on an estate whose sales have not started
                s.e.status === 'planned' && (
                  <text className="rs__soon" x={f1(s.cx)} y={f1(s.cy)} textAnchor="middle" dominantBaseline="middle">
                    скоро
                  </text>
                )
              )}
              <path className="rs__edge" d={s.path} />
              <text className="rs__label" x={f1(s.lx)} y={f1(s.ly + (s.side === 'middle' ? 14 : 0))} textAnchor={s.side}>
                <tspan className="rs__label-name">{s.e.name}</tspan>
                <tspan className="rs__label-sale" x={f1(s.lx)} dy="1.45em">
                  {estateSale(s.e).toLowerCase()}
                </tspan>
              </text>
            </a>
          ))}

          {/* a dark disc with a gold rim inside the ring: the house stands on it, the rim shows round the roof like a halo */}
          <circle className="rs__hub" cx={RING.cx} cy={RING.cy} r={RING.r1 - 8} />
          {/* the house stands on the ring like the tower in the reference */}
          <g mask="url(#rs-mask-h)">
            <image
              className="rs__house"
              href="/design/hero1-house.webp"
              x={RING.cx - HOUSE.w / 2}
              y={RING.cy + HOUSE.sink - HOUSE.h}
              width={HOUSE.w}
              height={HOUSE.h}
              mask="url(#rs-mask-v)"
            >
              <title>Кирпичный дом «Хорошего дома», проект «Тип 5»</title>
            </image>
          </g>
        </svg>
      )}

      {/* phones: the slices are too small to carry names — the same estates as a list */}
      <ul className="rs__list">
        {estates.map((e) => (
          <li key={e.slug} className={e.status === 'planned' ? 'is-soon' : e.free ? '' : 'is-sold'}>
            <a href={e.href}>
              <b>{softHyphens(e.name)}</b>
              <span>{estateSale(e).toLowerCase()}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="rs__facts">
        {facts.map((x) => (
          <div key={x.label}>
            <b>{x.value}</b>
            <span>{x.label}</span>
          </div>
        ))}
      </div>
      {note && <p className="rs__note">{note}</p>}
      <div className="btns rs__btns">{actions}</div>
    </section>
  )
}
