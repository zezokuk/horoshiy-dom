'use client'

import { useState, type ReactNode } from 'react'
import { plural } from '@/lib/format'
import type { EstateView } from '@/lib/view'
import { EstateCard } from './EstateCard'
import { EstatesMap } from './EstatesMap'

/** «На карте / Списком» switch with a live counter of free houses (as on gk-osnova / gk-nvm). */
export function EstatesView({
  estates,
  showRegion = false,
  cards,
}: {
  estates: EstateView[]
  showRegion?: boolean
  /** shown instead of the grid of estate cards (the region page: the fan of estate photos) */
  cards?: ReactNode
}) {
  const mappable = estates.some((e) => e.lat !== null && e.lng !== null)
  const [view, setView] = useState<'map' | 'list'>(mappable ? 'map' : 'list')
  const free = estates.reduce((s, e) => s + e.free, 0)
  const selling = estates.filter((e) => e.free > 0).length
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
        {mappable && (
          <div className="tabs" role="tablist" aria-label="Как показать посёлки">
            <button role="tab" aria-selected={view === 'map'} className={view === 'map' ? 'is-on' : ''} onClick={() => setView('map')}>
              На карте
            </button>
            <button role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'is-on' : ''} onClick={() => setView('list')}>
              Списком
            </button>
          </div>
        )}
        <span className="counter">
          <i />
          Доступно {free} {plural(free, 'дом', 'дома', 'домов')} в {selling} {plural(selling, 'посёлке', 'посёлках', 'посёлках')}
        </span>
      </div>
      {view === 'map' && <EstatesMap estates={estates} />}
      {cards ?? (
        <div className="grid grid--3">
          {estates.map((e, i) => (
            <div key={e.slug} data-reveal style={{ ['--d' as string]: `${i * 80}ms` }}>
              <EstateCard e={e} showRegion={showRegion} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
