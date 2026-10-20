'use client'

import { startTransition, useEffect, useMemo, useState, ViewTransition } from 'react'
import { plural } from '@/lib/format'
import type { HouseView } from '@/lib/view'
import { HouseCard } from './HouseCard'

type Sort = 'price-asc' | 'price-desc' | 'area-desc'
type Option = { value: string; label: string }

/**
 * Houses with filters. On the brand site there is also a region filter; on a region subdomain only its estates.
 * Filters can arrive in the URL: ?region=krd&estate=kalina&max=10000000&area=100 (search bar, ads).
 */
export function Catalog({ houses, regions, estates }: { houses: HouseView[]; regions?: Option[]; estates: (Option & { region: string })[] }) {
  const [region, setRegion] = useState('all')
  const [estate, setEstate] = useState('all')
  const [maxPrice, setMaxPrice] = useState(0)
  const [minArea, setMinArea] = useState(0)
  const [onlyFree, setOnlyFree] = useState(true)
  const [sort, setSort] = useState<Sort>('price-asc')

  // Filters from the URL are applied after hydration: the page is cached (ISR) without them, so reading
  // window.location during render would make the server and client HTML differ. One extra render, on load only.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    /* eslint-disable react-hooks/set-state-in-effect */
    if (q.get('region')) setRegion(q.get('region')!)
    if (q.get('estate')) setEstate(q.get('estate')!)
    if (q.get('max')) setMaxPrice(Number(q.get('max')))
    if (q.get('area')) setMinArea(Number(q.get('area')))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // a filter change is a transition, so the list animates (React <ViewTransition> below)
  const move = <T,>(set: (v: T) => void, v: T) => startTransition(() => set(v))

  const estateOptions = estates.filter((e) => region === 'all' || e.region === region)
  const list = useMemo(() => {
    const out = houses.filter(
      (h) =>
        (region === 'all' || h.regionSlug === region) &&
        (estate === 'all' || h.estateSlug === estate) &&
        (!maxPrice || h.price <= maxPrice) &&
        (!minArea || h.area >= minArea) &&
        (!onlyFree || h.status === 'free'),
    )
    return out.sort((a, b) => (sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : b.area - a.area))
  }, [houses, region, estate, maxPrice, minArea, onlyFree, sort])

  // budget steps follow real prices, so the list never offers an empty range
  const steps = useMemo(() => {
    const prices = houses.map((h) => h.price)
    if (!prices.length) return []
    const lo = Math.ceil(Math.min(...prices) / 1_000_000)
    const hi = Math.ceil(Math.max(...prices) / 1_000_000)
    const step = Math.max(1, Math.ceil((hi - lo) / 7)) // at most ~8 options
    const out: number[] = []
    for (let v = lo; v < hi; v += step) out.push(v * 1_000_000)
    out.push(hi * 1_000_000)
    return out
  }, [houses])

  return (
    <>
      <div className="filters">
        {regions && regions.length > 1 && (
          <label className="field">
            Регион
            <select
              value={region}
              onChange={(e) => {
                const v = e.target.value
                startTransition(() => {
                  setRegion(v)
                  setEstate('all')
                })
              }}
            >
              <option value="all">Все регионы</option>
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Посёлок
          <select value={estate} onChange={(e) => move(setEstate, e.target.value)}>
            <option value="all">Все посёлки</option>
            {estateOptions.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Бюджет до
          <select value={maxPrice} onChange={(e) => move(setMaxPrice, Number(e.target.value))}>
            <option value={0}>Любой</option>
            {steps.map((p) => (
              <option key={p} value={p}>
                {(p / 1_000_000).toLocaleString('ru-RU')} млн ₽
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Площадь дома от
          <select value={minArea} onChange={(e) => move(setMinArea, Number(e.target.value))}>
            <option value={0}>Любая</option>
            {[90, 100, 110, 140].map((a) => (
              <option key={a} value={a}>
                {a} м²
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Сортировка
          <select value={sort} onChange={(e) => move(setSort, e.target.value as Sort)}>
            <option value="price-asc">Сначала дешевле</option>
            <option value="price-desc">Сначала дороже</option>
            <option value="area-desc">Сначала больше</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={onlyFree} onChange={(e) => move(setOnlyFree, e.target.checked)} />
          Только свободные
        </label>
      </div>
      <p className="count">
        {list.length
          ? `Найдено ${list.length} ${plural(list.length, 'дом', 'дома', 'домов')}`
          : 'Ничего не нашлось — смягчите фильтры или оставьте заявку, подберём вручную.'}
      </p>
      <div className="grid grid--3">
        {list.map((h) => (
          // the filter runs as a transition: cards glide to new places, leave left, come in from the right (design.css)
          <ViewTransition key={h.code} name={`hc-${h.code}`} share="hc-move" update="hc-move" enter="hc-in" exit="hc-out" default="none">
            <HouseCard h={h} />
          </ViewTransition>
        ))}
      </div>
    </>
  )
}
