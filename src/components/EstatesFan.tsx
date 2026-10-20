import { f1, ringPoint, ringSlice, type Ring } from '@/lib/fan'
import { plural, softHyphens } from '@/lib/format'
import { estateSale, type EstateView } from '@/lib/view'

export type FanEstate = EstateView & { photo?: string }

// the scheme in SVG units: a half ring of the region's estates opening downwards around a disc with the numbers
const W = 1200
const H = 700
const RING: Ring = { cx: 600, cy: 200, r1: 160, r2: 440 }
const RL = 462 // labels: far enough in from the sides for «Нововеличковская» and «продан · 34 дома»
const FROM = 14 // degrees: 0 is to the right, 90 straight down, 180 to the left
const TO = 166
const GAP = 1.4

/**
 * The region's estates as a fan of real photos (reference 49d13… «The Gali»). Was the region's first screen with the
 * house in the middle; 20.10 Илья moved his generated picture there and the estates here, «ниже, но не с домом» —
 * the disc in the middle carries the numbers instead. Each slice is a photo of a house standing in that estate (the
 * caller picks it), a link to the estate, labelled with what can be bought there. No JS: slices pull out on pointing
 * with CSS. Phones: the labels would be too small, so the estates are listed under the fan.
 */
export function EstatesFan({ estates }: { estates: FanEstate[] }) {
  const n = estates.length
  if (!n) return null
  const free = estates.reduce((s, e) => s + e.free, 0)
  const selling = estates.filter((e) => e.free > 0).length
  const step = (TO - FROM) / n
  // left to right in the given order (the caller sorts: on sale first)
  const slices = estates.map((e, k) => {
    const a1 = TO - k * step - GAP / 2
    const a0 = TO - (k + 1) * step + GAP / 2
    const mid = (a0 + a1) / 2
    const [lx, ly] = ringPoint(RING, RL, mid)
    const side: 'start' | 'end' | 'middle' = mid < 75 ? 'start' : mid > 105 ? 'end' : 'middle'
    const [cx, cy] = ringPoint(RING, (RING.r1 + RING.r2) / 2, mid)
    const rad = (mid * Math.PI) / 180
    return { e, k, side, lx, ly, cx, cy, ...ringSlice(RING, a0, a1), dx: Math.cos(rad) * 14, dy: Math.sin(rad) * 14 }
  })

  return (
    <div className="ef" data-reveal>
      <svg className="ef__svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Посёлки: ${estates.map((e) => e.name).join(', ')}`}>
        <defs>
          <pattern id="ef-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M22 0H0V22" fill="none" stroke="#b0915f" strokeOpacity=".35" />
          </pattern>
          {slices.map((s) => (
            <clipPath key={s.e.slug} id={`ef-w-${s.e.slug}`}>
              <path d={s.path} />
            </clipPath>
          ))}
        </defs>

        {slices.map((s) => (
          <a
            key={s.e.slug}
            href={s.e.href}
            className={`ef__w is-${s.e.status === 'planned' ? 'soon' : s.e.free ? 'free' : 'sold'}`}
            style={{ ['--dx' as string]: `${f1(s.dx)}px`, ['--dy' as string]: `${f1(s.dy)}px`, ['--i' as string]: s.k }}
            aria-label={`${s.e.name}: ${estateSale(s.e).toLowerCase()}`}
          >
            <path className="ef__bg" d={s.path} fill={s.e.photo ? undefined : 'url(#ef-grid)'} />
            {s.e.photo ? (
              <image
                href={s.e.photo}
                x={f1(s.box.x)}
                y={f1(s.box.y)}
                width={f1(s.box.w)}
                height={f1(s.box.h)}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#ef-w-${s.e.slug})`}
              />
            ) : (
              // no photo yet: the gold grid; «скоро» only on an estate whose sales have not started
              s.e.status === 'planned' && (
                <text className="ef__soon" x={f1(s.cx)} y={f1(s.cy)} textAnchor="middle" dominantBaseline="middle">
                  скоро
                </text>
              )
            )}
            <path className="ef__edge" d={s.path} />
            <text className="ef__label" x={f1(s.lx)} y={f1(s.ly + (s.side === 'middle' ? 14 : 0))} textAnchor={s.side}>
              <tspan className="ef__label-name">{s.e.name}</tspan>
              <tspan className="ef__label-sale" x={f1(s.lx)} dy="1.45em">
                {estateSale(s.e).toLowerCase()}
              </tspan>
            </text>
          </a>
        ))}

        {/* the disc in the middle: what is on sale across the region (the same numbers as the counter above) */}
        <circle className="ef__hub" cx={RING.cx} cy={RING.cy} r={RING.r1 - 10} />
        <text className="ef__hub-n" x={RING.cx} y={RING.cy + 16} textAnchor="middle">
          {free}
        </text>
        <text className="ef__hub-t" x={RING.cx} y={RING.cy + 52} textAnchor="middle">
          {plural(free, 'дом', 'дома', 'домов')} в продаже
        </text>
        <text className="ef__hub-t ef__hub-t--sub" x={RING.cx} y={RING.cy + 78} textAnchor="middle">
          в {selling} {plural(selling, 'посёлке', 'посёлках', 'посёлках')}
        </text>
      </svg>

      {/* phones: the slices are too small to carry names — the same estates as a list */}
      <ul className="ef__list">
        {estates.map((e) => (
          <li key={e.slug} className={e.status === 'planned' ? 'is-soon' : e.free ? '' : 'is-sold'}>
            <a href={e.href}>
              <b>{softHyphens(e.name)}</b>
              <span>{estateSale(e).toLowerCase()}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
