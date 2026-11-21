'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

const PLOT_PRESETS = [
  { val: 3, label: 'Любой' },
  { val: 4, label: 'от 4 сот.' },
  { val: 4.2, label: 'от 4,2 сот.' },
  { val: 4.5, label: 'от 4,5 сот.' },
] as const

const STOREY_OPTIONS: readonly [StoreyFilter, string][] = [
  ['all', 'Любая'],
  ['1', '1 этаж'],
  ['mansard', 'С мансардой'],
  ['2', '2 этажа'],
]

export function HomeTypeShowcase({ types }: { types: ShowcaseType[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string>(() => (types.find((t) => t.free > 0) ?? types[0])?.slug ?? '')
  const [minPlot, setMinPlot] = useState<number>(3)
  const [bedrooms, setBedrooms] = useState<number | 'all'>('all')
  const [storey, setStorey] = useState<StoreyFilter>('all')
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false)
  const [popOpen, setPopOpen] = useState<boolean>(false)
  const [zoomPlan, setZoomPlan] = useState<boolean>(false)

  const popWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popOpen && !zoomPlan) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopOpen(false)
        setZoomPlan(false)
      }
    }
    const onDown = (e: PointerEvent) => {
      if (popOpen && popWrapRef.current && !popWrapRef.current.contains(e.target as Node)) {
        setPopOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [popOpen, zoomPlan])

  const matchingSlugs = useMemo(() => {
    return new Set(
      types
        .filter((t) => {
          if (onlyAvailable && t.free === 0) return false
          if (bedrooms !== 'all' && t.bedrooms !== bedrooms) return false
          if (storey === '1' && (t.storeys !== 1 || !!t.mansard)) return false
          if (storey === 'mansard' && !t.mansard) return false
          if (storey === '2' && t.storeys !== 2) return false
          if (minPlot > 3 && (t.maxPlot === null || t.maxPlot < minPlot)) return false
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

  const popFilterCount = (minPlot > 3 ? 1 : 0) + (storey !== 'all' ? 1 : 0) + (onlyAvailable ? 1 : 0)
  const hasAnyFilter = popFilterCount > 0 || bedrooms !== 'all'

  const resetAll = () => {
    setMinPlot(3)
    setBedrooms('all')
    setStorey('all')
    setOnlyAvailable(false)
  }

  const resetPopoverFilters = () => {
    setMinPlot(3)
    setStorey('all')
    setOnlyAvailable(false)
  }

  const popLabelParts: string[] = []
  if (minPlot > 3) popLabelParts.push(`от ${minPlot.toString().replace('.', ',')} сот.`)
  if (storey !== 'all') popLabelParts.push(STOREY_OPTIONS.find(([v]) => v === storey)?.[1] ?? '')
  if (onlyAvailable) popLabelParts.push('в наличии')
  const popSummaryLabel = popLabelParts.length > 0 ? popLabelParts.join(' · ') : 'Участок и параметры'

  const specs = [
    active.area ? `${formatArea(active.area)} м²` : null,
    active.bedrooms ? `${active.bedrooms} ${plural(active.bedrooms, 'спальня', 'спальни', 'спален')}` : null,
    active.storeys === 2 ? '2 этажа' : active.mansard ? `с мансардой (+${formatArea(active.mansard)} м²)` : '1 этаж',
  ]
    .filter(Boolean)
    .join(' · ')

  const plotRangeText =
    active.minPlot !== null && active.maxPlot !== null
      ? active.minPlot === active.maxPlot
        ? `Участок ИЖС ${active.minPlot.toString().replace('.', ',')} сот.`
        : `Участки ИЖС ${active.minPlot.toString().replace('.', ',')}–${active.maxPlot.toString().replace('.', ',')} сот.`
      : 'Участок ИЖС от 4 сот.'

  const areaLine =
    active.free > 0
      ? active.minArea && active.maxArea && active.minArea !== active.maxArea
        ? `${active.free} ${plural(active.free, 'дом', 'дома', 'домов')} в продаже${active.estates.length ? ` (${active.estates.join(', ')})` : ''}, площади вариантов — от ${formatArea(active.minArea)} до ${formatArea(active.maxArea)} м².`
        : `${active.free} ${plural(active.free, 'дом', 'дома', 'домов')} в продаже${active.estates.length ? ` в ${active.estates.join(', ')}` : ''}.`
      : 'Сейчас свободных домов этого типа нет в наличии — посмотрите планировку, закажите строительство в новом районе или выберите другой проект.'

  return (
    <div className="v4-ts">
      {/* Ряд 1: выбор типа проекта 1..12 */}
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

      {/* Ряд 2: чистые фильтры без шума — быстрые спальни + всплывающее окно «Участок и параметры» + переход к карте и каталогу */}
      <div className="v4-ts__controls">
        <div className="v4-ts__controls-left">
          <div className="v4-pik-rooms" role="group" aria-label="Количество спален">
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

          <div className="v4-ts__pop-wrap" ref={popWrapRef}>
            <button
              type="button"
              className={`v4-pik-btn v4-ts__pop-btn${popFilterCount > 0 ? ' is-active' : ''}${popOpen ? ' is-open' : ''}`}
              aria-expanded={popOpen}
              aria-controls="v4-plot-popover"
              onClick={() => setPopOpen((v) => !v)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M2 4.5h12M4.5 8h7M6.5 11.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>{popSummaryLabel}</span>
              {popFilterCount > 0 && <em className="v4-ts__pop-badge">{popFilterCount}</em>}
              <i className={`v4-ts__caret${popOpen ? ' is-up' : ''}`} aria-hidden>▾</i>
            </button>

            {popOpen && (
              <div
                id="v4-plot-popover"
                className="v4-ts__popover"
                role="dialog"
                aria-label="Подобрать дом по участку и этажности"
              >
                <div className="v4-ts__pop-head">
                  <b>Подбор по участку и этажности</b>
                  <button type="button" className="v4-ts__pop-close" onClick={() => setPopOpen(false)} aria-label="Закрыть">
                    ✕
                  </button>
                </div>

                <div className="v4-ts__pop-group">
                  <div className="v4-ts__pop-lbl">
                    <span>Размер участка (сотки)</span>
                    <b>{minPlot <= 3 ? 'от 3 сот. (любой)' : `от ${minPlot.toString().replace('.', ',')} сот.`}</b>
                  </div>
                  <div className="v4-ts__pop-chips">
                    {PLOT_PRESETS.map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        className={minPlot === p.val ? 'is-on' : ''}
                        aria-pressed={minPlot === p.val}
                        onClick={() => setMinPlot(p.val)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="v4-ts__pop-slider">
                    <input
                      type="range"
                      min={3}
                      max={6}
                      step={0.1}
                      value={minPlot}
                      aria-label="Минимальный размер участка в сотках"
                      onChange={(e) => setMinPlot(Number(e.target.value))}
                    />
                    <div className="v4-ts__pop-scale" aria-hidden>
                      <span>3 сот.</span>
                      <span>4,5 сот.</span>
                      <span>6+ сот.</span>
                    </div>
                  </div>
                </div>

                <div className="v4-ts__pop-group">
                  <div className="v4-ts__pop-lbl">
                    <span>Этажность дома</span>
                  </div>
                  <div className="v4-ts__pop-chips">
                    {STOREY_OPTIONS.map(([val, lbl]) => (
                      <button
                        key={val}
                        type="button"
                        className={storey === val ? 'is-on' : ''}
                        aria-pressed={storey === val}
                        onClick={() => setStorey(val)}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="v4-ts__pop-group">
                  <label className="v4-ts__pop-check">
                    <input
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                    />
                    <span>Только готовые дома в наличии ({totalFree})</span>
                  </label>
                </div>

                <div className="v4-ts__pop-foot">
                  <button
                    type="button"
                    className="v4-ts__pop-reset"
                    disabled={popFilterCount === 0}
                    onClick={resetPopoverFilters}
                  >
                    Сбросить
                  </button>
                  <button
                    type="button"
                    className="v4-pik-btn v4-pik-btn--accent"
                    onClick={() => setPopOpen(false)}
                  >
                    <span>Показать ({matchingSlugs.size})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="v4-ts__controls-right">
          <a href="#karta" className="v4-pik-btn v4-pik-btn--map">
            <span>Посёлки на карте ↓</span>
            <i className="v4-pik-mapdot" aria-hidden />
          </a>

          <a href="/v4/doma" className="v4-pik-btn v4-pik-btn--accent">
            <span>{totalFree} {plural(totalFree, 'дом', 'дома', 'домов')} в продаже →</span>
          </a>
        </div>
      </div>

      {/* Активные фильтры — появляются только когда пользователь применил отбор */}
      {hasAnyFilter && (
        <div className="v4-ts__active-bar" role="status" aria-live="polite">
          <span className="v4-ts__active-count">
            Подходит <b>{matchingSlugs.size}</b> из {types.length} {plural(types.length, 'проекта', 'проектов', 'проектов')}
          </span>
          <div className="v4-ts__active-tags">
            {bedrooms !== 'all' && (
              <button type="button" onClick={() => setBedrooms('all')}>
                {bedrooms} сп. <span>✕</span>
              </button>
            )}
            {minPlot > 3 && (
              <button type="button" onClick={() => setMinPlot(3)}>
                Участок от {minPlot.toString().replace('.', ',')} сот. <span>✕</span>
              </button>
            )}
            {storey !== 'all' && (
              <button type="button" onClick={() => setStorey('all')}>
                {STOREY_OPTIONS.find(([v]) => v === storey)?.[1]} <span>✕</span>
              </button>
            )}
            {onlyAvailable && (
              <button type="button" onClick={() => setOnlyAvailable(false)}>
                В наличии <span>✕</span>
              </button>
            )}
            <button type="button" className="is-reset" onClick={resetAll}>
              Сбросить все
            </button>
          </div>
        </div>
      )}

      {/* Если под фильтр не подошёл ни один готовый проект — честная подсказка */}
      {matchingSlugs.size === 0 && (
        <div className="v4-ts__empty">
          <p>Готовых проектов под выбранные параметры сейчас нет — попробуйте снизить минимальную площадь участка до 4 сот. или сбросить отбор.</p>
          <div className="v4-ts__empty-acts">
            <button type="button" className="v4-pik-btn" onClick={() => setMinPlot(4)}>
              <span>Участок от 4 сот.</span>
            </button>
            <button type="button" className="v4-pik-btn v4-pik-btn--accent" onClick={resetAll}>
              <span>Показать все {types.length} типов</span>
            </button>
          </div>
        </div>
      )}

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

        <div
          className={`v4-ts__plan${active.plan ? ' v4-ts__plan--clickable' : ''}`}
          onClick={() => active.plan && setZoomPlan(true)}
          role={active.plan ? 'button' : undefined}
          tabIndex={active.plan ? 0 : undefined}
          onKeyDown={(e) => e.key === 'Enter' && active.plan && setZoomPlan(true)}
          title={active.plan ? 'Нажмите, чтобы развернуть планировку' : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {active.plan ? (
            <>
              <img src={active.plan} alt={`Планировка «${active.name}»`} loading="lazy" />
              <span className="v4-ts__plan-zoom-hint" aria-hidden>🔍 Увеличить планировку</span>
            </>
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
          <p className="v4-ts__plot-tag">{plotRangeText}</p>
          <p className="v4-ts__price">
            {active.fromPrice ? `от ${formatMillions(active.fromPrice)}` : 'Уточнить стоимость'}
          </p>
          <p className="v4-ts__desc">{areaLine}</p>

          <div className="v4-ts__actions">
            <a className="v4-pik-btn v4-pik-btn--accent" href={active.href}>
              <span>Смотреть проект «{active.name}»{active.free > 0 ? ` (${active.free})` : ''} →</span>
            </a>
            <a className="v4-pik-btn v4-pik-btn--map" href="#karta">
              <span>Выбрать участок на карте посёлков ↓</span>
              <i className="v4-pik-mapdot" aria-hidden />
            </a>
          </div>
        </div>
      </article>

      {/* Логический продуктовый переход к Шагу 05: карта посёлков и генплан Динской */}
      <div className="v4-ts__next-step">
        <div className="v4-ts__next-copy">
          <span className="v4-ts__step-badge">Шаг 05 · Локация и участок</span>
          <p>
            {active.estates.length > 0
              ? `Проект «${active.name}» сейчас в продаже: ${active.estates.join(', ')}. Посмотрите посёлки на карте и выберите конкретный участок.`
              : `Понравился «${active.name}»? Посмотрите ниже расположение посёлков на карте, чтобы выбрать участок под застройку.`}
          </p>
        </div>
        <div className="v4-ts__next-links">
          <a href="#karta" className="v4-pik-btn v4-pik-btn--map">
            <span>Посмотреть посёлки на карте ↓</span>
            <i className="v4-pik-mapdot" aria-hidden />
          </a>
          <a href="/v4/poselok/dinskaya#genplan" className="v4-pik-btn">
            <span>Генплан Динской · 36 участков →</span>
          </a>
        </div>
      </div>

      {/* Модальное окно с детальной планировкой */}
      {zoomPlan && active.plan && (
        <div className="v4-plan-modal" onClick={() => setZoomPlan(false)} role="dialog" aria-modal="true" aria-label={`Планировка ${active.name}`}>
          <div className="v4-plan-modal__content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="v4-plan-modal__close" onClick={() => setZoomPlan(false)} aria-label="Закрыть">
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.plan} alt={`Планировка «${active.name}»`} />
            <div className="v4-plan-modal__caption">
              <h4>{active.name}</h4>
              <p>{specs}{active.fromPrice ? ` · от ${formatMillions(active.fromPrice)}` : ''}</p>
              <a className="v4-pik-btn v4-pik-btn--accent" href={active.href}>
                <span>Смотреть страницу проекта →</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
