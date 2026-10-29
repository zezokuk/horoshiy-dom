'use client'

import { useState } from 'react'
import { Genplan } from '@/components/Genplan'
import type { GenplanEstate } from '@/lib/genplan'
import { formatMillions, plural } from '@/lib/format'
import type { HouseView } from '@/lib/view'

export type PlotEstate = { name: string; href: string; estate: GenplanEstate; houses: HouseView[] }

/**
 * Home v2, screen 4 «Выбрать свободный участок» (Alexander's idea, 27.10): the company sells houses in its estates
 * first, so the visitor picks a free plot on the estate's plan — our 3D plan, the thing no reference site has.
 */
export function PlotPicker({ estates }: { estates: PlotEstate[] }) {
  const [i, setI] = useState(0)
  const cur = estates[i]
  if (!cur) return null
  const free = cur.houses.filter((h) => h.status === 'free').sort((a, b) => a.price - b.price)
  return (
    <div className="v2-plots">
      <div className="v2-plots__side">
        <div className="v2-tabs" role="tablist" aria-label="Посёлок">
          {estates.map((e, n) => (
            <button key={e.estate.slug} type="button" role="tab" aria-selected={n === i} onClick={() => setI(n)}>
              {e.name}
            </button>
          ))}
        </div>
        <p className="v2-plots__count">
          {free.length ? `${free.length} ${plural(free.length, 'свободный дом', 'свободных дома', 'свободных домов')} с участком` : 'Свободных домов сейчас нет'}
        </p>
        <ul className="v2-plots__list">
          {free.slice(0, 6).map((h) => (
            <li key={h.code}>
              <a href={h.href}>
                <span className="v2-plots__no">{h.plotNo ? `№ ${h.plotNo}` : '—'}</span>
                <span className="v2-plots__what">
                  <b>{h.title}</b>
                  <span>
                    {h.area.toLocaleString('ru-RU')} м²{h.plot ? ` · ${h.plot}` : ''}
                  </span>
                </span>
                <span className="v2-plots__price">{formatMillions(h.price)}</span>
              </a>
            </li>
          ))}
        </ul>
        <a className="btn btn--line btn--sm" href={cur.href}>
          Весь посёлок и генплан
        </a>
      </div>
      <div className="v2-plots__plan">
        <Genplan key={cur.estate.slug} estate={cur.estate} houses={cur.houses} />
      </div>
    </div>
  )
}
