import { formatMillions, plural } from '@/lib/format'
import type { RegionView } from '@/lib/view'

export type RegionStats = { estates: number; free: number; priceFrom: number | null; cover?: string }

/**
 * «Где мы строим»: a card per region. Active regions show real numbers from the catalog,
 * «soon» regions invite to the waiting list. The interactive map of Russia goes into the `map` slot.
 */
export function Regions({ regions, stats, map }: { regions: RegionView[]; stats: Record<string, RegionStats>; map?: React.ReactNode }) {
  return (
    <div className={`regions ${map ? 'regions--map' : ''}`}>
      {map && <div className="regions__map">{map}</div>}
      <div className="regions__list">
        {regions.map((r) => {
          const s = stats[r.slug]
          return (
            <a key={r.slug} href={r.href} className={`region-card region-card--${r.status}`} data-reveal>
              {s?.cover && <img src={s.cover} alt="" loading="lazy" decoding="async" />}
              <div className="region-card__body">
                <span className="region-card__status">{r.status === 'soon' ? 'Скоро' : 'Продаём и строим'}</span>
                <b>{r.name}</b>
                {r.tagline && <span>{r.tagline}</span>}
                {r.status === 'active' && s ? (
                  <span className="region-card__meta">
                    {s.estates} {plural(s.estates, 'посёлок', 'посёлка', 'посёлков')} · {s.free} {plural(s.free, 'дом', 'дома', 'домов')} в продаже
                    {s.priceFrom ? ` · от ${formatMillions(s.priceFrom)}` : ''}
                  </span>
                ) : (
                  <span className="region-card__meta">Запишитесь — сообщим первыми о старте продаж</span>
                )}
                <span className="region-card__go">{r.status === 'soon' ? 'Записаться →' : 'Смотреть дома →'}</span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
