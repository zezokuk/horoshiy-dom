'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { formatMillions, plural } from '@/lib/format'
import { houseTitle, type HouseView } from '@/lib/view'

/**
 * Reference «HAVN» (20.10): soft filter tiles next to the 3D plan — bedrooms, area, a price range over a histogram of
 * the free houses — and a ribbon of house cards over the scene. Matching houses stay lit in 3D, the rest go grey
 * (Genplan3D `match`). Only real data: the values come from the houses of this estate.
 */

const AREAS = [
  { id: 's', label: 'до 100 м²', test: (a: number) => a < 100 },
  { id: 'm', label: '100–120 м²', test: (a: number) => a >= 100 && a <= 120 },
  { id: 'l', label: 'от 120 м²', test: (a: number) => a > 120 },
]
const BINS = 14

export type FilterState = {
  rooms: number | null
  area: string | null
  price: [number, number] | null
}
export const NO_FILTER: FilterState = { rooms: null, area: null, price: null }

export function passes(u: HouseView, f: FilterState) {
  if (f.rooms !== null && (f.rooms >= 4 ? (u.bedrooms ?? 0) < 4 : u.bedrooms !== f.rooms))
    return false
  const area = AREAS.find((a) => a.id === f.area)
  if (area && !area.test(u.area)) return false
  if (f.price && (u.price < f.price[0] || u.price > f.price[1])) return false
  return true
}

export function isFiltered(f: FilterState) {
  return f.rooms !== null || f.area !== null || f.price !== null
}

export function Filters({
  free,
  f,
  setF,
  found,
}: {
  free: HouseView[]
  f: FilterState
  setF: (f: FilterState) => void
  found: number
}) {
  const rooms = useMemo(
    () => [...new Set(free.map((u) => Math.min(4, u.bedrooms ?? 0)).filter(Boolean))].sort(),
    [free],
  )
  const areas = AREAS.filter((a) => free.some((u) => a.test(u.area)))
  const lo = Math.min(...free.map((u) => u.price))
  const hi = Math.max(...free.map((u) => u.price))
  const step = Math.max(100_000, Math.round((hi - lo) / 40 / 100_000) * 100_000)
  const [p0, p1] = f.price ?? [lo, hi]
  const bins = useMemo(() => {
    const out = Array<number>(BINS).fill(0)
    for (const u of free)
      out[Math.min(BINS - 1, Math.floor(((u.price - lo) / Math.max(1, hi - lo)) * BINS))]++
    return out
  }, [free, lo, hi])
  const top = Math.max(...bins)
  const setPrice = (a: number, b: number) =>
    setF({ ...f, price: a <= lo && b >= hi ? null : [Math.min(a, b), Math.max(a, b)] })
  if (!free.length) return null

  return (
    <div className="gf" aria-label="Подбор дома">
      <div className="gf__tile gf__tile--head">
        <b>
          {found} из {free.length}
        </b>
        <span>{plural(free.length, 'свободного дома', 'свободных домов', 'свободных домов')}</span>
        {isFiltered(f) && (
          <button type="button" className="gf__reset" onClick={() => setF(NO_FILTER)}>
            Сбросить
          </button>
        )}
      </div>

      {rooms.length > 1 && (
        <div className="gf__tile">
          <span className="gf__k">Спальни</span>
          <div className="gf__opts">
            {rooms.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={f.rooms === r}
                onClick={() => setF({ ...f, rooms: f.rooms === r ? null : r })}
              >
                {r >= 4 ? '4+' : r}
              </button>
            ))}
          </div>
        </div>
      )}

      {areas.length > 1 && (
        <div className="gf__tile">
          <span className="gf__k">Площадь дома</span>
          <div className="gf__opts">
            {areas.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={f.area === a.id}
                onClick={() => setF({ ...f, area: f.area === a.id ? null : a.id })}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {hi > lo && (
        <div className="gf__tile gf__tile--price">
          <span className="gf__k">Цена</span>
          {/* histogram of the free houses' prices; bars inside the chosen range are dark */}
          <div className="gf__bars" aria-hidden>
            {bins.map((c, i) => {
              const from = lo + ((hi - lo) * i) / BINS
              const to = lo + ((hi - lo) * (i + 1)) / BINS
              return (
                <i
                  key={i}
                  className={to >= p0 && from <= p1 ? 'is-in' : ''}
                  style={{ height: `${c ? 18 + (c / top) * 82 : 6}%` }}
                />
              )
            })}
          </div>
          <div className="gf__range">
            <input
              type="range"
              min={lo}
              max={hi}
              step={step}
              value={p0}
              aria-label="Цена от"
              onChange={(e) => setPrice(Math.min(+e.target.value, p1), p1)}
            />
            <input
              type="range"
              min={lo}
              max={hi}
              step={step}
              value={p1}
              aria-label="Цена до"
              onChange={(e) => setPrice(p0, Math.max(+e.target.value, p0))}
            />
          </div>
          <span className="gf__price">
            {formatMillions(p0)} — {formatMillions(p1)}
          </span>
        </div>
      )}
    </div>
  )
}

/** Free houses as a ribbon of cards over the scene: a tap shows the house in 3D, «Открыть» opens its page. */
export function Ribbon({
  units,
  active,
  onPick,
}: {
  units: { n: number; u: HouseView }[]
  active: number | null
  onPick: (n: number) => void
}) {
  if (!units.length)
    return (
      <div className="gr gr--empty">
        <p>
          Под эти условия свободных домов нет — сбросьте фильтр или спросите менеджера о похожих.
        </p>
      </div>
    )
  return (
    <ul className="gr" aria-label="Свободные дома">
      {units.map(({ n, u }) => (
        <li key={u.code} className={n === active ? 'is-on' : ''}>
          <button
            type="button"
            className="gr__pick"
            onClick={() => onPick(n)}
            aria-label={`Показать на генплане: ${houseTitle(u)}`}
          >
            {u.photoCard && <img src={u.photoCard} alt="" loading="lazy" decoding="async" />}
            <span className="gr__price">{formatMillions(u.price)}</span>
            <span className="gr__title">{houseTitle(u)}</span>
            <span className="gr__chips">
              {u.bedrooms ? (
                <i>
                  {u.bedrooms} {plural(u.bedrooms, 'спальня', 'спальни', 'спален')}
                </i>
              ) : null}
              {u.plot ? <i>{u.plot}</i> : null}
            </span>
          </button>
          <Link href={u.href} className="gr__open">
            Открыть →
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function useFilter() {
  return useState<FilterState>(NO_FILTER)
}
