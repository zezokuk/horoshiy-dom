'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { goal } from '@/components/Metrika'
import { annuity, formatArea, formatMillions, plural } from '@/lib/format'
import type { HouseView } from '@/lib/view'
import planData from '@/v4/dinskaya-plan.json'
import './dinskayaGenplan.css'

type RawPlot = {
  n: number
  type: string
  crossed?: boolean
  street: string
  poly: number[][]
  area: number
  house?: number[][]
  houseHull?: number[][]
}

const PLOTS = (planData as { plots: RawPlot[] }).plots
const ALL_PTS = PLOTS.flatMap((p) => p.poly)
const PAD = 14
const X0 = Math.min(...ALL_PTS.map((q) => q[0])) - PAD
const Y0 = Math.min(...ALL_PTS.map((q) => q[1])) - PAD
const X1 = Math.max(...ALL_PTS.map((q) => q[0])) + PAD
const Y1 = Math.max(...ALL_PTS.map((q) => q[1])) + PAD
const FULL_BOX = { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 }

function clampPan(value: number, extent: number, scale: number) {
  const limit = extent * (1 - 1 / scale) / 2
  return Math.max(-limit, Math.min(limit, value))
}

const cleanStreetOnly = (s: string) =>
  s
    .replace(/,?\s*уч\.?\s*\d+\s*[–-]\s*\d+/gi, '')
    .replace(/,?\s*уч\.?\s*\d+(?:\s*,\s*\d+)+/gi, '')
    .replace(/,?\s*\d+\s*[–-]\s*\d+$/g, '')
    .trim()

const shortStreet = (s: string) =>
  cleanStreetOnly(s).replace('ул. ', '').replace('300-летия Кубанского войска', '300-летия')

const ptsStr = (pts: number[][]) => pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ')
const centerOf = (pts: number[][]) => ({
  x: pts.reduce((a, b) => a + b[0], 0) / pts.length,
  y: pts.reduce((a, b) => a + b[1], 0) / pts.length,
})

export function DinskayaGenplan({
  houses,
  infrastructure,
  nearby,
  family = { rate: 6, years: 30, minDown: 20, limit: 6_000_000 },
  estateHref = '/v4/poselok/dinskaya',
  hideEstateLink = false,
}: {
  houses: HouseView[]
  infrastructure: string[]
  nearby: { label: string; value: string }[]
  family?: { rate: number; years: number; minDown: number; limit: number }
  estateHref?: string
  hideEstateLink?: boolean
  onBackToMap?: () => void
}) {
  const [layer, setLayer] = useState<'aerial' | 'scheme'>('aerial')
  const [showList, setShowList] = useState<boolean>(false)
  const [showInfra, setShowInfra] = useState<boolean>(false)
  const infraButton = useRef<HTMLButtonElement>(null)
  const [zoomScale, setZoomScale] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null)
  const [hoverPlot, setHoverPlot] = useState<number | null>(null)

  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const suppressClick = useRef(false)
  const dragRef = useRef<{ x: number; y: number; px: number; py: number; unitsPerPixel: number } | null>(null)

  const houseByPlot = useMemo(() => {
    const map = new Map<number, HouseView>()
    houses.forEach((h) => {
      if (h.plotNo != null) map.set(h.plotNo, h)
    })
    return map
  }, [houses])

  const plotStatusOf = (p: RawPlot) => {
    const h = houseByPlot.get(p.n)
    if (h) return h.status
    if (p.crossed) return 'sold'
    return 'pending'
  }

  const freeRows = useMemo(() => {
    return PLOTS.filter((p) => houseByPlot.get(p.n)?.status === 'free')
      .map((p) => ({ plot: p, house: houseByPlot.get(p.n)! }))
      .sort((a, b) => a.house.price - b.house.price)
  }, [houseByPlot])

  const counts = useMemo(() => {
    let free = 0
    let reserved = 0
    let sold = 0
    let pending = 0
    PLOTS.forEach((p) => {
      const st = plotStatusOf(p)
      if (st === 'free') free++
      else if (st === 'reserved') reserved++
      else if (st === 'sold') sold++
      else pending++
    })
    return { free, reserved, sold, pending }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houseByPlot])

  const activePlot = useMemo(() => PLOTS.find((p) => p.n === selectedPlot) ?? null, [selectedPlot])
  const activeHouse = activePlot ? houseByPlot.get(activePlot.n) ?? null : null
  const hoveredPlot = useMemo(() => PLOTS.find((p) => p.n === hoverPlot) ?? null, [hoverPlot])
  const hoveredHouse = hoveredPlot ? houseByPlot.get(hoveredPlot.n) ?? null : null

  const activeMonthly = useMemo(() => {
    if (!activeHouse) return 0
    const share = Math.max(family.minDown, Math.ceil(((activeHouse.price - family.limit) / activeHouse.price) * 100))
    const credit = activeHouse.price * (1 - share / 100)
    return Math.round(annuity(credit, family.rate, family.years))
  }, [activeHouse, family])

  useEffect(() => {
    if (selectedPlot === null) return
    closeRef.current?.focus({ preventScroll: true })
    if (window.matchMedia('(max-width: 860px)').matches) {
      closeRef.current?.closest('aside')?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    }
  }, [selectedPlot])

  const closePlot = () => {
    setSelectedPlot(null)
    const trigger = triggerRef.current
    if (trigger instanceof HTMLElement || trigger instanceof SVGElement) trigger.focus()
  }

  const handleSelectPlot = (n: number, trigger?: Element) => {
    if (trigger) triggerRef.current = trigger
    setSelectedPlot(n)
    setShowInfra(false)
    goal('v4_plot_click', { plot: n })
  }

  const resetView = () => {
    setZoomScale(1)
    setPan({ x: 0, y: 0 })
  }

  const zoomTo = (value: number) => {
    const scale = Math.max(1, Math.min(2.6, Number(value.toFixed(2))))
    setZoomScale(scale)
    setPan(({ x, y }) => ({
      x: clampPan(x, FULL_BOX.w, scale),
      y: clampPan(y, FULL_BOX.h, scale),
    }))
  }

  return (
    <div className="np-gp">
      <div className={`np-gp__stage${zoomScale > 1 ? ' is-pannable' : ''}`}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return
          if (selectedPlot !== null) closePlot()
          else if (showInfra) { setShowInfra(false); infraButton.current?.focus() }
          else if (showList) {
            setShowList(false)
            e.currentTarget.querySelector<HTMLButtonElement>('.np-gp__pill')?.focus()
          }
        }}>
        <svg
          viewBox={`${FULL_BOX.x} ${FULL_BOX.y} ${FULL_BOX.w} ${FULL_BOX.h}`}
          preserveAspectRatio="xMidYMid meet"
          className={`np-gp__svg np-gp__svg--${layer}`}
          role="group"
          aria-label="Генплан Динской, 36 участков"
          onPointerDown={(e) => {
            suppressClick.current = false
            if (zoomScale <= 1 || !e.isPrimary || e.button !== 0) return
            const pixelScale = e.currentTarget.getScreenCTM()?.a ?? 1
            dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, unitsPerPixel: 1 / (pixelScale * zoomScale) }
          }}
          onPointerMove={(e) => {
            const drag = dragRef.current
            if (!drag || !e.isPrimary) return
            const dx = e.clientX - drag.x
            const dy = e.clientY - drag.y
            if (!suppressClick.current && Math.hypot(dx, dy) < 5) return
            suppressClick.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            e.currentTarget.classList.add('is-dragging')
            setPan({
              x: clampPan(drag.px - dx * drag.unitsPerPixel, FULL_BOX.w, zoomScale),
              y: clampPan(drag.py - dy * drag.unitsPerPixel, FULL_BOX.h, zoomScale),
            })
          }}
          onPointerUp={(e) => { dragRef.current = null; e.currentTarget.classList.remove('is-dragging') }}
          onPointerCancel={(e) => { dragRef.current = null; e.currentTarget.classList.remove('is-dragging') }}
          onPointerLeave={(e) => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) dragRef.current = null }}
        >
          <defs>
            <filter id="np-pin-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1.1" stdDeviation="1.2" floodColor="#0c1b11" floodOpacity="0.34" />
            </filter>
          </defs>

          <g className="np-gp__canvas" style={{ transform: `translate(${-pan.x * zoomScale}px, ${-pan.y * zoomScale}px) scale(${zoomScale})` }}>
            {layer === 'aerial' ? (
              <image
                href="/v4/img/dinskaya-aerial.webp"
                x={FULL_BOX.x}
                y={FULL_BOX.y}
                width={FULL_BOX.w}
                height={FULL_BOX.h}
                preserveAspectRatio="none"
              />
            ) : (
              <rect x={FULL_BOX.x} y={FULL_BOX.y} width={FULL_BOX.w} height={FULL_BOX.h} fill="#efeadd" />
            )}

            {PLOTS.map((p) => {
              const st = plotStatusOf(p)
              const h = houseByPlot.get(p.n)
              const isSel = selectedPlot === p.n
              const isHov = hoverPlot === p.n
              const c = centerOf(p.poly)
              const isFree = st === 'free'
              return (
                <g
                  key={p.n}
                  className={`v4-gp__plot np-gp__plot np-gp__plot--${st}${isSel ? ' is-sel' : ''}${isHov ? ' is-hov' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Участок ${p.n}, ${h?.title ?? p.type}, ${st === 'free' ? `свободен, ${h ? formatMillions(h.price) : ''}` : st === 'reserved' ? 'бронь' : st === 'sold' ? 'продан' : 'уточнить статус'}`}
                  onMouseEnter={() => setHoverPlot(p.n)}
                  onMouseLeave={() => setHoverPlot((cur) => (cur === p.n ? null : cur))}
                  onClick={(e) => {
                    if (!suppressClick.current) handleSelectPlot(p.n, e.currentTarget)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelectPlot(p.n, e.currentTarget)
                    }
                  }}
                >
                  <polygon className="np-gp__poly" points={ptsStr(p.poly)} />
                  {layer === 'scheme' && p.house && <polygon className="np-gp__scheme-house" points={ptsStr(p.houseHull ?? p.house)} />}
                  <g className={`np-gp__pin np-gp__pin--${st}${isSel ? ' is-sel' : ''}`} filter={isFree || isSel ? 'url(#np-pin-shadow)' : undefined}>
                    <circle cx={c.x} cy={c.y} r={isSel ? 6.2 : isFree ? 5.2 : 3.8} />
                    <text x={c.x} y={c.y + 1.45} textAnchor="middle">
                      {p.n}
                    </text>
                  </g>
                </g>
              )
            })}

          </g>
        </svg>

        <div className="np-gp__top-left">
          <button
            type="button"
            className={`np-gp__pill${showList ? ' is-active' : ''}`}
            aria-expanded={showList}
            onClick={() => { setSelectedPlot(null); setShowInfra(false); setShowList((v) => !v) }}
          >
            <span className="np-gp__pill-icon" aria-hidden>☰</span>
            <span>{showList ? 'Скрыть список' : `Показать список (${counts.free})`}</span>
          </button>

          {hoveredPlot && hoveredPlot.n !== selectedPlot && !showList && (
            <div className="np-gp__hover-tip" aria-hidden>
              <span className={`np-gp__dot np-gp__dot--${plotStatusOf(hoveredPlot)}`} />
              <b>Уч. № {hoveredPlot.n}</b>
              <span>{hoveredHouse ? hoveredHouse.title.split(',')[0] : hoveredPlot.type}</span>
              {hoveredHouse && <em>{formatArea(hoveredHouse.area)} м² · {formatMillions(hoveredHouse.price)}</em>}
            </div>
          )}
        </div>

        {showList && (
          <aside className="np-gp__list-drawer" aria-label="Список свободных участков в Динской">
            <div className="np-gp__list-head">
              <div>
                <b>Свободные дома</b>
                <span>{counts.free} {plural(counts.free, 'участок', 'участка', 'участков')} в продаже</span>
              </div>
              <button type="button" onClick={() => setShowList(false)} aria-label="Закрыть список">
                ✕
              </button>
            </div>
            <ul className="np-gp__list-items">
              {freeRows.map(({ plot, house }) => (
                <li key={plot.n}>
                  <button
                    type="button"
                    className={selectedPlot === plot.n ? 'is-sel' : undefined}
                    onClick={(e) => handleSelectPlot(plot.n, e.currentTarget)}
                  >
                    <span className="np-gp__list-num">{plot.n}</span>
                    <span className="np-gp__list-main">
                      <b>{house.title.split(',')[0]} · {formatArea(house.area)} м²</b>
                      <small>{shortStreet(plot.street)} · {(plot.area / 100).toFixed(1).replace('.', ',')} сот.</small>
                    </span>
                    <strong className="np-gp__list-price">{formatMillions(house.price)}</strong>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="np-gp__zoom" role="group" aria-label="Масштаб генплана">
          <button type="button" disabled={zoomScale >= 2.6} onClick={() => zoomTo(zoomScale * 1.28)} aria-label="Приблизить генплан">
            +
          </button>
          <button
            type="button"
            disabled={zoomScale <= 1}
            onClick={() => zoomTo(zoomScale / 1.28)}
            aria-label="Отдалить генплан"
          >
            −
          </button>
          {zoomScale > 1.02 && (
            <button type="button" onClick={resetView} aria-label="Сбросить масштаб" className="np-gp__zoom-reset">
              ↺
            </button>
          )}
        </div>

        <div className="np-gp__bottom-bar">
          <ul className="np-gp__legend" aria-label="Статусы участков">
            <li><i className="is-free" />Свободно ({counts.free})</li>
            <li><i className="is-res" />Бронь ({counts.reserved})</li>
            <li><i className="is-sold" />Продано ({counts.sold})</li>
            {counts.pending > 0 && <li><i className="is-pending" />Уточняется ({counts.pending})</li>}
          </ul>

          <div className="np-gp__controls">
            {(infrastructure.length > 0 || nearby.length > 0) && (
              <button type="button" ref={infraButton} className="np-gp__switch" aria-expanded={showInfra}
                onClick={() => { setSelectedPlot(null); setShowList(false); setShowInfra(value => !value) }}>
                Инфраструктура <span aria-hidden>{showInfra ? '−' : '+'}</span>
              </button>
            )}

            <div className="np-gp__mode" role="group" aria-label="Режим отображения">
              <button type="button" aria-pressed={layer === 'aerial'} onClick={() => setLayer('aerial')}>
                Вид сверху
              </button>
              <button type="button" aria-pressed={layer === 'scheme'} onClick={() => setLayer('scheme')}>
                Схема
              </button>
            </div>
          </div>
        </div>

        {showInfra && (
          <aside className="np-gp__infra-card" aria-label="Инфраструктура Динской">
            <button type="button" className="np-gp__infra-close" onClick={() => {
              setShowInfra(false)
              infraButton.current?.focus()
            }} aria-label="Закрыть инфраструктуру">×</button>
            <h3>Рядом с посёлком</h3>
            <ul>{infrastructure.map(item => <li key={item}>{item}</li>)}</ul>
            {nearby.map(item => <p key={item.label}>{item.label} · {item.value}</p>)}
          </aside>
        )}

        {activePlot && (
          <aside className="v4-gp__card np-gp__drawer" aria-label={`Карточка участка № ${activePlot.n}`}>
            <button type="button" ref={closeRef} className="np-gp__drawer-close" onClick={closePlot} aria-label="Закрыть карточку участка">
              ✕
            </button>

            <div className="np-gp__drawer-scroll">
              {activeHouse?.photoCard || activeHouse?.photo ? (
                <div className="np-gp__drawer-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeHouse.photoCard ?? activeHouse.photo} alt={activeHouse.title} />
                  <span className="np-gp__drawer-tag">Изображение проекта</span>
                </div>
              ) : (
                <div className="np-gp__drawer-img np-gp__drawer-img--empty">
                  <span>Участок № {activePlot.n} · {activePlot.type}</span>
                </div>
              )}

              <div className="np-gp__drawer-body">
                <p className={`v3-status np-gp__status--${plotStatusOf(activePlot)}`}>
                  <i />
                  {plotStatusOf(activePlot) === 'free'
                    ? `Свободен · участок № ${activePlot.n}`
                    : plotStatusOf(activePlot) === 'reserved'
                      ? `В брони · участок № ${activePlot.n}`
                      : plotStatusOf(activePlot) === 'sold'
                        ? `Продан · участок № ${activePlot.n}`
                        : `Уточняется · участок № ${activePlot.n}`}
                </p>

                <h4>
                  {activeHouse
                    ? `${activeHouse.title.split(',')[0]} · ${formatArea(activeHouse.area)} м²`
                    : `${activePlot.type} · участок № ${activePlot.n}`}
                </h4>
                <p className="np-gp__drawer-addr">
                  ст. Динская · {cleanStreetOnly(activePlot.street)} · участок № {activePlot.n}
                </p>

                <dl className="np-gp__drawer-specs">
                  <div>
                    <dt>Участок</dt>
                    <dd>{(activePlot.area / 100).toFixed(1).replace('.', ',')} сот.</dd>
                  </div>
                  {activeHouse?.bedrooms && (
                    <div>
                      <dt>Спальни</dt>
                      <dd>{activeHouse.bedrooms}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Отделка</dt>
                    <dd>White Box</dd>
                  </div>
                </dl>

                {activeHouse ? (
                  <div className="np-gp__drawer-pricebox">
                    <p className="np-gp__drawer-price">{formatMillions(activeHouse.price)}</p>
                    {activeMonthly > 0 && (
                      <p className="np-gp__drawer-mort">
                        от <b>{activeMonthly.toLocaleString('ru-RU')} ₽/мес</b> по семейной ипотеке при ставке {family.rate.toLocaleString('ru-RU')}%
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="np-gp__drawer-note">
                    {activePlot.crossed
                      ? 'Этот дом уже обрёл хозяев. Выберите свободный участок рядом или оставьте заявку.'
                      : 'Статус и стоимость участка уточняются у отдела продаж.'}
                  </p>
                )}
              </div>
            </div>

            <div className="np-gp__drawer-foot">
              {activeHouse ? (
                <a
                  className="v3-btn v3-btn--main np-gp__drawer-cta"
                  href={`/v4/dom/${activeHouse.code}`}
                  onClick={() => goal('v4_house_open', { code: activeHouse.code, from: 'genplan_drawer' })}
                >
                  Открыть дом →
                </a>
              ) : (
                <div className="np-gp__drawer-pair">
                  {freeRows.length > 0 && <button type="button" className="v3-btn v3-btn--main" onClick={() => {
                    closePlot()
                    setShowList(true)
                    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.np-gp__list-items button')?.focus())
                  }}>
                    Свободные дома
                  </button>}
                  <a className="v4-pik-btn" href={hideEstateLink ? '#evf-form' : estateHref}>
                    <span>Уточнить</span>
                  </a>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
