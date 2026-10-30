'use client'

import { useMemo, useState } from 'react'
import { formatArea, plural } from '@/lib/format'
import type { ProjectCardData } from './ProjectCard'

export type PickerProject = ProjectCardData & { href: string }

const facts = (p: ProjectCardData) =>
  [
    p.area ? `${formatArea(p.area)} м²${p.mansard ? ` + ${formatArea(p.mansard)} м² мансарда` : ''}` : '',
    p.bedrooms ? `${p.bedrooms} ${plural(p.bedrooms, 'спальня', 'спальни', 'спален')}` : '',
    p.storeys && p.storeys > 1 ? `${p.storeys} этажа` : '',
  ].filter(Boolean)

/**
 * «Выберите проект» on «Построить»: the chosen house big, with its facts and one button, and the whole range under it from
 * the smallest to the biggest, so the choice reads as «какого размера мне нужен дом». Replaced the fan of photo slices,
 * which the client did not take to (call of 30.10). Every thumbnail is a button, so it works by touch and from the keyboard.
 */
export function ProjectPicker({ projects, first }: { projects: PickerProject[]; first?: string }) {
  const range = useMemo(() => [...projects].sort((a, b) => (a.area ?? 0) - (b.area ?? 0)), [projects])
  const [slug, setSlug] = useState(first ?? range[0]?.slug)
  const cur = range.find((p) => p.slug === slug) ?? range[0]
  if (!cur) return null
  return (
    <div className="pp">
      <div className="pp__main">
        <figure className="pp__photo">
          {/* key: a new picture fades in instead of swapping under the eye */}
          {cur.photo && <img key={cur.slug} src={cur.photo} alt={`Дом по проекту «${cur.name}»`} decoding="async" />}
        </figure>
        <div className="pp__info" aria-live="polite">
          <h3>{cur.name}</h3>
          <p className="pp__facts">{facts(cur).join(' · ')}</p>
          {cur.free > 0 && (
            <p className="pp__free">
              {cur.free} {plural(cur.free, 'дом', 'дома', 'домов')} по проекту в продаже
            </p>
          )}
          <a className="btn btn--green" href={cur.href}>
            Смотреть проект →
          </a>
        </div>
      </div>
      <ul className="pp__range" aria-label="Все проекты, от меньшего к большему">
        {range.map((p) => (
          <li key={p.slug}>
            <button type="button" aria-pressed={p.slug === cur.slug} onClick={() => setSlug(p.slug)}>
              <span className="pp__thumb">{p.photoCard && <img src={p.photoCard} alt="" loading="lazy" decoding="async" />}</span>
              <b>{p.name}</b>
              {p.area ? <span>{formatArea(p.area)} м²</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
