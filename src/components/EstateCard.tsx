import { formatMillions, plural } from '@/lib/format'
import type { EstateView } from '@/lib/view'

export function EstateCard({ e, showRegion = false }: { e: EstateView; showRegion?: boolean }) {
  return (
    <a href={e.href} className="estate-card">
      {e.coverCard && (
        <img
          src={e.coverCard}
          srcSet={e.cover ? `${e.coverCard} 640w, ${e.cover} 1600w` : undefined}
          sizes="(min-width: 1024px) 400px, (min-width: 700px) 50vw, 100vw"
          alt={e.name}
          loading="lazy"
          decoding="async"
        />
      )}
      <div className="estate-card__body">
        <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>
          {showRegion ? `${e.regionName} · ${e.place}` : e.place}
        </span>
        <span className="estate-card__name">{e.name}</span>
        <span className="estate-card__meta">
          <span>{e.free ? `${e.free} ${plural(e.free, 'дом', 'дома', 'домов')} в продаже` : 'Продажи завершены'}</span>
          {e.priceFrom && <span>от {formatMillions(e.priceFrom)}</span>}
        </span>
      </div>
    </a>
  )
}
