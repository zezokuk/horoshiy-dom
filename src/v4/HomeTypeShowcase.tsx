'use client'

import { useMemo, useState } from 'react'
import { goal } from '@/components/Metrika'
import { formatArea, formatMillions, plural } from '@/lib/format'

export type ShowcaseType = {
  slug: string
  num: number
  name: string
  area: number | null
  mansard: number | null
  storeys: number | null
  bedrooms: number | null
  bathrooms: number | null
  photo?: string
  plan?: string
  free: number
  fromPrice: number | null
  minArea: number | null
  maxArea: number | null
  minPlot: number | null
  maxPlot: number | null
  estates: string[]
  href: string
}

type StoreyFilter = 'all' | '1' | 'mansard' | '2'

export function HomeTypeShowcase({ types }: { types: ShowcaseType[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string>(() => (types.find((t) => t.free > 0) ?? types[0])?.slug ?? '')
  const [minPlot, setMinPlot] = useState<number>(3)
  const [bedrooms, setBedrooms] = useState<number | 'all'>('all')
  const [storey, setStorey] = useState<StoreyFilter>('all')
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false)

  const matchingSlugs = useMemo(() => {
    return new Set(
      types
        .filter((t) => {
          if (onlyAvailable && t.free === 0) return false
          if (bedrooms !== 'all' && t.bedrooms !== bedrooms) return false
          if (storey === '1' && (t.storeys !== 1 || !!t.mansard)) return false
          if (storey === 'mansard' && !t.mansard) return false
          if (storey === '2' && t.storeys !== 2) return false
          if (minPlot > 3 && t.maxPlot !== null && t.maxPlot < minPlot) return false
          return true
        })
        .map((t) => t.slug),
    )
  }, [types, onlyAvailable, bedrooms, storey, minPlot])

  const active = useMemo(() => {
    const exact = types.find((t) => t.slug === selectedSlug)
    if (exact && matchingSlugs.has(exact.slug)) return exact
    return types.find((t) => matchingSlugs.has(t.slug)) ?? exact ?? types[0]
  }, [types, selectedSlug, matchingSlugs])

  const sortedByNum = useMemo(() => [...types].sort((a, b) => a.num - b.num), [types])
  const totalFree = useMemo(() => types.reduce((acc, t) => acc + t.free, 0), [types])

  if (!active) return null

  const specs = [
    active.area ? `${formatArea(active.area)} м²` : null,
    active.bedrooms ? `${active.bedrooms} ${plural(active.bedrooms, 'спальня', 'спальни', 'спален')}` : null,
    active.storeys === 2 ? '2 этажа' : active.mansard ? `с мансардой (+${formatArea(active.mansard)} м²)` : '1 этаж',
  ]
    .filter(Boolean)
    .join(' · ')

  const areaLine =
    active.free > 0
      ? active.minArea && active.maxArea && active.minArea !== active.maxArea
        ? `${active.free} ${plural(active.free, 'дом', 'дома', 'домов')} в продаже${active.estates.length ? ` (${active.estates.join(', ')})` : ''}, площади вариантов — от ${formatArea(active.minArea)} до ${formatArea(active.maxArea)} м².`
        : `${active.free} ${plural(active.free, 'дом', 'дома', 'домов')} в продаже${active.estates.length ? ` в ${active.estates.join(', ')}` : ''}.`
      : 'Сейчас свободных домов этого типа нет в наличии — посмотрите планировку или выберите другой тип.'

  return (
    <div className="v4-ts">
      {/* Ряд 1: выбор типа дома 1..12 круглыми пилюлями */}
      <div className="v4-ts__bar">
        <span className="v4-ts__bar-label">выбрать тип дома</span>
        <div className="v4-ts__nums" role="tablist" aria-label="Типы проектов домов">
          {sortedByNum.map((t) => {
            const isSel = t.slug === active.slug
            const isMatch = matchingSlugs.has(t.slug)
            return (
              <button
                key={t.slug}
                type="button"
                role="tab"
                aria-selected={isSel}
                aria-label={`${t.name}${t.free > 0 ? `, ${t.free} в продаже` : ''}`}
                className={`v4-ts__num${isSel ? ' is-on' : ''}${t.free > 0 ? ' has-free' : ''}${!isMatch ? ' is-dim' : ''}`}
                onClick={() => {
                  setSelectedSlug(t.slug)
                  goal('v4_type_select', { type: t.name })
                }}
              >
                {t.num}
              </button>
            )
          })}
        </div>
      </div>

      {/* Ряд 2: фильтры-капсулы в стиле ПИК (спальни кружками, участок, этажность, кнопка «На карте» с иконкой и счётчик) */}
      <div className="v4-ts__filters v4-pik-bar">
        <div className="v4-pik-rooms" role="group" aria-label="Спальни">
          {(['all', 2, 3, 4] as const).map((b) => (
            <button
              key={String(b)}
              type="button"
              className={`v4-pik-circle${bedrooms === b ? ' is-on' : ''}`}
              aria-pressed={bedrooms === b}
              onClick={() => setBedrooms(b)}
            >
              {b === 'all' ? 'Все сп.' : `${b} сп.`}
            </button>
          ))}
        </div>

        <label className="v4-ts__pill v4-ts__pill--range">
          <span>участок</span>
          <span className="v4-ts__range-wrap">
            <small>от {minPlot} сот.</small>
            <input
              type="range"
              min={3}
              max={6}
              step={0.5}
              value={minPlot}
              aria-label="Минимальный размер участка в сотках"
              onChange={(e) => setMinPlot(Number(e.target.value))}
            />
          </span>
        </label>

        <div className="v4-ts__pill" role="group" aria-label="Этажность">
          <div className="v4-ts__seg">
            {(
              [
                ['all', 'Все эт.'],
                ['1', '1 эт.'],
                ['mansard', 'Мансарда'],
                ['2', '2 эт.'],
              ] as const
            ).map(([val, lbl]) => (
              <button key={val} type="button" aria-pressed={storey === val} onClick={() => setStorey(val)}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`v4-pik-btn${onlyAvailable ? ' is-dark' : ''}`}
          aria-pressed={onlyAvailable}
          onClick={() => setOnlyAvailable((v) => !v)}
        >
          <span>В наличии</span>
        </button>

        <a href="#karta" className="v4-pik-btn v4-pik-btn--map">
          <span>На карте</span>
          <i className="v4-pik-mapdot" aria-hidden />
        </a>

        <a href="/v4/doma" className="v4-pik-btn v4-pik-btn--accent">
          <span>{totalFree} {plural(totalFree, 'дом', 'дома', 'домов')} в продаже</span>
        </a>
      </div>

      {/* Карточка выбранного типа */}
      <article className="v4-ts__card" key={active.slug}>
        <figure className="v4-ts__photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {active.photo ? (
            <img src={active.photo} alt={`Проект «${active.name}»`} loading="lazy" />
          ) : (
            <span className="v3-card__noimg">Фото скоро</span>
          )}
          <figcaption>Изображение проекта</figcaption>
        </figure>

        <div className="v4-ts__plan">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {active.plan ? (
            <img src={active.plan} alt={`Планировка «${active.name}»`} loading="lazy" />
          ) : (
            <span className="v3-card__noimg">Планировка скоро</span>
          )}
        </div>

        <div className="v4-ts__info">
          <div className="v4-ts__top">
            <h3>{active.name}</h3>
            {active.free > 0 ? (
              <span className="v3-status">
                <i />
                {active.free} в продаже
              </span>
            ) : (
              <span className="v3-status v3-status--off">
                <i />
                под заказ в новом районе
              </span>
            )}
          </div>
          {specs && <p className="v4-ts__specs">{specs}</p>}
          <p className="v4-ts__price">
            {active.fromPrice ? `от ${formatMillions(active.fromPrice)}` : 'Уточнить стоимость'}
          </p>
          <p className="v4-ts__desc">{areaLine}</p>

          <div className="v4-ts__actions">
            <a className="v4-pik-btn v4-pik-btn--accent" href={active.href}>
              <span>Смотреть проект и планировку</span>
              <span aria-hidden>›</span>
            </a>
            <a className="v4-pik-btn v4-pik-btn--map" href="#karta">
              <span>Выбрать участок на карте</span>
              <i className="v4-pik-mapdot" aria-hidden />
            </a>
          </div>
        </div>
      </article>
    </div>
  )
}
