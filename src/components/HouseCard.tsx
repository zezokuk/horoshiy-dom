import { STATUS_LABEL, formatPrice, plural } from '@/lib/format'
import type { HouseView } from '@/lib/view'

function tagsFor(h: HouseView) {
  const tags: string[] = []
  if (h.features.includes('Два этажа')) tags.push('Два этажа')
  if (h.mansard) tags.push('Мансарда')
  if (h.bedrooms === 4) tags.push('4 спальни')
  if (h.features.some((f) => f.startsWith('Терраса'))) tags.push('Терраса')
  if (h.bathrooms === 2) tags.push('2 санузла')
  return tags.slice(0, 3)
}

export function HouseCard({ h, showEstate = true }: { h: HouseView; showEstate?: boolean }) {
  return (
    <a href={h.href} className={`house-card ${h.status === 'sold' ? 'is-sold' : ''}`}>
      <div className="house-card__img">
        {h.photoCard && (
          <img
            src={h.photoCard}
            srcSet={h.photo ? `${h.photoCard} 640w, ${h.photo} 1600w` : undefined}
            sizes="(min-width: 1024px) 400px, (min-width: 700px) 50vw, 100vw"
            width={640}
            height={348}
            alt={`${h.title}, ${h.area} м²`}
            loading="lazy"
            decoding="async"
          />
        )}
        <span className={`badge badge--${h.status}`}>{STATUS_LABEL[h.status]}</span>
      </div>
      <div className="house-card__body">
        <div className="house-card__price">{formatPrice(h.price)}</div>
        <div className="house-card__title">
          Дом {h.area.toLocaleString('ru-RU')} м²{h.mansard ? ` + ${h.mansard} м² мансарда` : ''}
        </div>
        <div className="house-card__meta">
          {showEstate && <span>{h.estateName}</span>}
          {h.plot && <span>{h.plot}</span>}
          {!!h.bedrooms && <span>{h.bedrooms} {plural(h.bedrooms, 'спальня', 'спальни', 'спален')}</span>}
          <span>{h.title}</span>
        </div>
        <div className="tags">
          {tagsFor(h).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </a>
  )
}
