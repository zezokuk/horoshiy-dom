import { plural } from '@/lib/format'
import { mainHref } from '@/lib/site'

export type ProjectCardData = {
  slug: string
  name: string
  area: number | null
  mansard: number | null
  storeys: number | null
  bedrooms: number | null
  photo?: string
  photoCard?: string
  free: number
}

export function ProjectCard({ p }: { p: ProjectCardData }) {
  return (
    <a href={mainHref(`/projects/${p.slug}`)} className="house-card">
      <div className="house-card__img">
        {p.photoCard && (
          <img
            src={p.photoCard}
            srcSet={p.photo ? `${p.photoCard} 640w, ${p.photo} 1600w` : undefined}
            sizes="(min-width: 1024px) 400px, (min-width: 700px) 50vw, 100vw"
            alt={`Проект ${p.name}`}
            loading="lazy"
            decoding="async"
          />
        )}
        {p.free > 0 && <span className="badge badge--free">{p.free} в продаже</span>}
      </div>
      <div className="house-card__body">
        <div className="house-card__price">{p.name}</div>
        <div className="house-card__title">
          {p.area ? `${p.area.toLocaleString('ru-RU')} м²` : ''}
          {p.mansard ? ` + ${p.mansard} м² мансарда` : ''}
        </div>
        <div className="house-card__meta">
          {p.storeys && <span>{p.storeys === 2 ? 'Два этажа' : 'Один этаж'}</span>}
          {!!p.bedrooms && <span>{p.bedrooms} {plural(p.bedrooms, 'спальня', 'спальни', 'спален')}</span>}
        </div>
      </div>
    </a>
  )
}
