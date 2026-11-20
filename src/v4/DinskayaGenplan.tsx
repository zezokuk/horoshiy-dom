'use client'

import { useMemo, useRef, useState } from 'react'
import { goal } from '@/components/Metrika'
import { annuity, formatArea, formatMillions, plural } from '@/lib/format'
import type { HouseView } from '@/lib/view'
import planData from '@/v4/dinskaya-plan.json'

type RawPlot = {
  n: number
  type: string
  crossed?: boolean
  street: string
  poly: number[][]
  area: number
  house?: number[][]
  houseSize?: number[]
}

const PLOTS = (planData as { plots: RawPlot[] }).plots

const ALL_PTS = PLOTS.flatMap((p) => p.poly)
const PAD = 14
const X0 = Math.min(...ALL_PTS.map((q) => q[0])) - PAD
const Y0 = Math.min(...ALL_PTS.map((q) => q[1])) - PAD
const X1 = Math.max(...ALL_PTS.map((q) => q[0])) + PAD
const Y1 = Math.max(...ALL_PTS.map((q) => q[1])) + PAD
const FULL_BOX = { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 }

const shortStreet = (s: string) =>
  s.replace('ул. ', '').replace('300-летия Кубанского войска', '300-летия').replace(', уч. ', ' ')

const ptsStr = (pts: number[][]) => pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ')
const centerOf = (pts: number[][]) => ({
  x: pts.reduce((a, b) => a + b[0], 0) / pts.length,
  y: pts.reduce((a, b) => a + b[1], 0) / pts.length,
})

const INFRA_CHIPS = [
  { icon: '🏫', label: 'Школа №3 и садик' },
  { icon: '🛒', label: 'Магазины и пункты выдачи' },
  { icon: '🌊', label: 'Река Кочеты рядом' },
  { icon: '🚌', label: 'Удобный выезд на трассу' },
]

export function DinskayaGenplan({
  houses,
  family = { rate: 6, years: 30, minDown: 20, limit: 6_000_000 },
  estateHref = '/v4/poselok/dinskaya',
  hideEstateLink = false,
}: {
  houses: HouseView[]
  family?: { rate: number; years: number; minDown: number; limit: number }
  estateHref?: string
  hideEstateLink?: boolean
  onBackToMap?: () => void
}) {
  const [layer, setLayer] = useState<'aerial' | 'scheme'>('aerial')
  const [onlyFree, setOnlyFree] = useState<boolean>(false)
  const [zoomScale, setZoomScale] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null)
  const [hoverPlot, setHoverPlot] = useState<number | null>(null)
  const [compareCodes, setCompareCodes] = useState<string[]>([])

  const dragRef = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null)

  const houseByPlot = useMemo(() => {
    const map = new Map<number, HouseView>()
    houses.forEach((h) => {
      if (h.plotNo != null) map.set(h.plotNo, h)
    })
    return map
  }, [houses])

  // Улицы подписываем прямо на карте генплана (без 9 лишних кнопок приближения наверху!)
  const streetLabels = useMemo(() => {
    const groups = new Map<string, RawPlot[]>()
    PLOTS.forEach((p) => {
      const list = groups.get(p.street) ?? []
      list.push(p)
      groups.set(p.street, list)
    })
    return [...groups.entries()].map(([name, plots]) => {
      const pts = plots.flatMap((p) => p.poly)
      const minY = Math.min(...pts.map((q) => q[1]))
      const c = centerOf(pts)
      const label = shortStreet(name)
      const width = Math.max(38, label.length * 2.1 + 10)
      return { name, label, x: c.x, y: minY - 6.5, width }
    })
  }, [])

  const counts = useMemo(() => {
    let free = 0
    let reserved = 0
    let sold = 0
    let pending = 0
    PLOTS.forEach((p) => {
      const h = houseByPlot.get(p.n)
      if (h?.status === 'free') free++
      else if (h?.status === 'reserved') reserved++
      else if (h?.status === 'sold' || p.crossed) sold++
      else pending++
    })
    return { free, reserved, sold, pending }
  }, [houseByPlot])

  const viewBox = useMemo(() => {
    const cx = FULL_BOX.x + FULL_BOX.w / 2 + pan.x
    const cy = FULL_BOX.y + FULL_BOX.h / 2 + pan.y
    const w = FULL_BOX.w / zoomScale
    const h = FULL_BOX.h / zoomScale
    return `${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`
  }, [zoomScale, pan])

  const activePlot = useMemo(() => PLOTS.find((p) => p.n === selectedPlot) ?? null, [selectedPlot])
  const activeHouse = activePlot ? houseByPlot.get(activePlot.n) ?? null : null

  const hoveredPlot = useMemo(() => PLOTS.find((p) => p.n === hoverPlot) ?? null, [hoverPlot])
  const hoveredHouse = hoveredPlot ? houseByPlot.get(hoveredPlot.n) ?? null : null

  const activeMonthly = useMemo(() => {
    if (!activeHouse) return 0
    const share = Math.max(family.minDown, Math.ceil(((activeHouse.price - family.limit) / activeHouse.price) * 100))
    const credit = activeHouse.price * (1 - share / 100)
    return annuity(credit, family.rate, family.years)
  }, [activeHouse, family])

  const compareList = useMemo(
    () => compareCodes.map((c) => houses.find((h) => h.code === c)).filter((x): x is HouseView => Boolean(x)),
    [compareCodes, houses],
  )

  const toggleCompare = (code: string) => {
    setCompareCodes((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev.slice(-1), code]))
  }

  const plotStatusOf = (p: RawPlot) => {
    const h = houseByPlot.get(p.n)
    if (h) return h.status
    if (p.crossed) return 'sold'
    return 'pending'
  }

  const handleSelectPlot = (n: number) => {
    setSelectedPlot(n)
    goal('v4_plot_click', { plot: n })
  }

  const selectNearbyFree = () => {
    const freePlot = PLOTS.find((p) => houseByPlot.get(p.n)?.status === 'free')
    if (freePlot) handleSelectPlot(freePlot.n)
  }

  const resetView = () => {
    setZoomScale(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div className="v4-gp">
      {/* Одна чистая строка управления (убраны 3 этажа лишних кнопок по UX-аудиту!) */}
      <div className="v4-gp__toolbar">
        <div className="v4-gp__filters" role="group" aria-label="Фильтр участков">
          <button
            type="button"
            className={`v4-pik-btn${!onlyFree ? ' is-dark' : ''}`}
            aria-pressed={!onlyFree}
            onClick={() => setOnlyFree(false)}
          >
            <span>Все {PLOTS.length} участков</span>
          </button>
          <button
            type="button"
            className={`v4-pik-btn${onlyFree ? ' v4-pik-btn--accent' : ''}`}
            aria-pressed={onlyFree}
            onClick={() => setOnlyFree(true)}
          >
            <span>Только в продаже · {counts.free}</span>
          </button>
        </div>

        <div className="v4-gp__mode" role="group" aria-label="Подложка генплана">
          <button type="button" aria-pressed={layer === 'aerial'} onClick={() => setLayer('aerial')}>
            Спутник
          </button>
          <button type="button" aria-pressed={layer === 'scheme'} onClick={() => setLayer('scheme')}>
            Схема
          </button>
        </div>
      </div>

      <div
        className={`v4-gp__stage${zoomScale > 1 ? ' is-pannable' : ''}`}
        onPointerDown={(e) => {
          if (zoomScale <= 1) return
          if ((e.target as HTMLElement).closest('aside, button, a')) return
          dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }
        }}
        onPointerMove={(e) => {
          const d = dragRef.current
          if (!d) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
          const k = (FULL_BOX.w / zoomScale) / Math.max(400, e.currentTarget.clientWidth)
          const limX = (FULL_BOX.w * (zoomScale - 1)) / (2 * zoomScale)
          const limY = (FULL_BOX.h * (zoomScale - 1)) / (2 * zoomScale)
          setPan({
            x: Math.max(-limX, Math.min(limX, d.px - dx * k)),
            y: Math.max(-limY, Math.min(limY, d.py - dy * k)),
          })
        }}
        onPointerUp={() => { dragRef.current = null }}
        onPointerCancel={() => { dragRef.current = null }}
      >
        <svg viewBox={viewBox} className={`v4-gp__svg v4-gp__svg--${layer}`} role="img" aria-label="Интерактивный генплан станицы Динской — 36 участков">
          <defs>
            <linearGradient id="gp-free-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3c8d5a" />
              <stop offset="100%" stopColor="#1f5333" />
            </linearGradient>
            <linearGradient id="gp-free-hot" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2e7d4b" />
              <stop offset="100%" stopColor="#14331f" />
            </linearGradient>
            <filter id="gp-shadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="0.8" stdDeviation="1.1" floodColor="#0e1b13" floodOpacity="0.32" />
            </filter>
          </defs>

          {layer === 'aerial' && (
            <image
              href="/v4/img/dinskaya-aerial.webp"
              x={FULL_BOX.x}
              y={FULL_BOX.y}
              width={FULL_BOX.w}
              height={FULL_BOX.h}
              preserveAspectRatio="none"
              opacity={0.96}
            />
          )}

          {PLOTS.map((p) => {
            const st = plotStatusOf(p)
            const h = houseByPlot.get(p.n)
            const isSel = selectedPlot === p.n
            const isHov = hoverPlot === p.n
            const dimmed = onlyFree && st !== 'free'
            const c = centerOf(p.poly)
            return (
              <g
                key={p.n}
                className={`v4-gp__plot v4-gp__plot--${st}${isSel ? ' is-sel' : ''}${isHov ? ' is-hov' : ''}${dimmed ? ' is-dim' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`Участок ${p.n}, ${h?.title ?? p.type}, ${st === 'free' ? `свободен, ${h ? formatMillions(h.price) : ''}` : st === 'reserved' ? 'бронь' : st === 'sold' ? 'продан' : 'уточнить статус'}`}
                onMouseEnter={() => setHoverPlot(p.n)}
                onMouseLeave={() => setHoverPlot((cur) => (cur === p.n ? null : cur))}
                onClick={() => {
                  if (dragRef.current?.moved) return
                  handleSelectPlot(p.n)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelectPlot(p.n)
                  }
                }}
              >
                <polygon points={ptsStr(p.poly)} />
                {p.house && <polygon className="v4-gp__roof" points={ptsStr(p.house)} />}
                <text x={c.x} y={c.y + 1.3} textAnchor="middle" className="v4-gp__pno">
                  {p.n}
                </text>
              </g>
            )
          })}

          {/* Названия улиц расположены прямо на карте генплана (чисто и без лишних кнопок) */}
          {streetLabels.map((st) => (
            <g key={st.name} className="v4-gp__glabel" filter="url(#gp-shadow)">
              <rect x={st.x - st.width / 2} y={st.y - 3.6} width={st.width} height={6.8} rx={3.4} />
              <text x={st.x} y={st.y + 1.0} textAnchor="middle">
                {st.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Мгновенный ховер-тултип по наведению на участок (без лишнего клика) */}
        {hoveredPlot && hoveredPlot.n !== selectedPlot && (
          <div className="v4-gp__hover-tip" aria-hidden>
            <span className={`v4-gp__hdot v4-gp__hdot--${plotStatusOf(hoveredPlot)}`} />
            <b>Уч. {hoveredPlot.n}</b>
            <span>{hoveredHouse ? hoveredHouse.title : hoveredPlot.type}</span>
            {hoveredHouse && <em>{formatArea(hoveredHouse.area)} м² · {formatMillions(hoveredHouse.price)}</em>}
          </div>
        )}

        {/* Компактный зум + / − */}
        <div className="v4-gp__zoom">
          <button type="button" onClick={() => setZoomScale((z) => Math.min(2.6, Number((z * 1.28).toFixed(2))))} aria-label="Приблизить генплан">+</button>
          <button
            type="button"
            onClick={() => {
              const next = Math.max(1, Number((zoomScale / 1.28).toFixed(2)))
              setZoomScale(next)
              if (next <= 1.02) setPan({ x: 0, y: 0 })
            }}
            aria-label="Отдалить генплан"
          >
            −
          </button>
          {zoomScale > 1.02 && (
            <button type="button" onClick={resetView} aria-label="Сбросить масштаб">
              ↺
            </button>
          )}
        </div>

        {/* Стеклянная карточка выбранного участка (Figma 278-1246) */}
        {activePlot && (
          <aside className="v4-gp__card" aria-live="polite">
            <button type="button" className="v4-gp__close" onClick={() => setSelectedPlot(null)} aria-label="Закрыть карточку участка">
              ✕
            </button>

            {activeHouse?.photoCard || activeHouse?.photo ? (
              <div className="v4-gp__cimg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeHouse.photoCard ?? activeHouse.photo} alt={activeHouse.title} />
                <a
                  className="v4-gp__3dtag"
                  href={`/v4/dom/${activeHouse.code}`}
                  onClick={() => goal('v4_house_open', { code: activeHouse.code, from: 'genplan_3d_badge' })}
                >
                  смотреть 3D-модель →
                </a>
              </div>
            ) : (
              <div className="v4-gp__cimg v4-gp__cimg--empty">
                <span>Участок № {activePlot.n} · {activePlot.type}</span>
              </div>
            )}

            <div className="v4-gp__cbody">
              <p className={`v3-status v4-gp__cstatus v4-gp__cstatus--${plotStatusOf(activePlot)}`}>
                <i />
                {plotStatusOf(activePlot) === 'free'
                  ? `Свободен · участок ${activePlot.n}`
                  : plotStatusOf(activePlot) === 'reserved'
                    ? `В брони · участок ${activePlot.n}`
                    : plotStatusOf(activePlot) === 'sold'
                      ? `Продан · участок ${activePlot.n}`
                      : `Уточняется · участок ${activePlot.n}`}
              </p>

              <h4>
                {activeHouse ? `${activeHouse.title} · ${formatArea(activeHouse.area)} м²` : `${activePlot.type} · уч. ${activePlot.n}`}
              </h4>
              <p className="v4-gp__cmeta">
                {activePlot.street} · {(activePlot.area / 100).toFixed(1).replace('.', ',')} сот.
                {activeHouse?.bedrooms ? ` · ${activeHouse.bedrooms} сп.` : ''}
              </p>

              {activeHouse ? (
                <>
                  <p className="v4-gp__cprice">{formatMillions(activeHouse.price)}</p>
                  {activeMonthly > 0 && (
                    <p className="v4-gp__cmort">≈ {activeMonthly.toLocaleString('ru-RU')} ₽/мес по семейной ипотеке 6%</p>
                  )}
                  <div className="v4-gp__cbtns">
                    <a
                      className="v3-btn v3-btn--main"
                      href={`/v4/dom/${activeHouse.code}`}
                      onClick={() => goal('v4_house_open', { code: activeHouse.code, from: 'genplan_card' })}
                    >
                      3D и планировка →
                    </a>
                    <button
                      type="button"
                      className={`v4-gp__cmp${compareCodes.includes(activeHouse.code) ? ' is-on' : ''}`}
                      onClick={() => toggleCompare(activeHouse.code)}
                    >
                      {compareCodes.includes(activeHouse.code) ? 'В сравнении ✓' : 'Сравнить'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="v4-gp__cmort">
                    {activePlot.crossed
                      ? 'Этот участок уже обрёл хозяев. Нажмите кнопку ниже, чтобы посмотреть свободные дома в Динской.'
                      : 'Статус и стоимость участка уточняются у отдела продаж.'}
                  </p>
                  <div className="v4-gp__cbtns">
                    <button type="button" className="v3-btn v3-btn--main" onClick={selectNearbyFree}>
                      Свободный участок рядом
                    </button>
                    <a className="v4-gp__cmp" href="#evf-form">
                      Уточнить
                    </a>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Легенда + инфраструктура в одну аккуратную полосу */}
      <div className="v4-gp__foot">
        <ul className="v4-gp__legend">
          <li><i className="is-free" />в продаже — {counts.free}</li>
          <li><i className="is-res" />бронь — {counts.reserved}</li>
          <li><i className="is-sold" />продан — {counts.sold}</li>
          <li><i className="is-pend" />уточнить — {counts.pending}</li>
        </ul>
        <div className="v4-gp__infra">
          {INFRA_CHIPS.map((c) => (
            <span key={c.label}>
              <i aria-hidden>{c.icon}</i>
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <div className="v4-gp__summary">
        <div>
          <h3>Динская · {counts.free} {plural(counts.free, 'дом', 'дома', 'домов')} в продаже</h3>
          <p>
            Наведите на любой участок для быстрой цены или нажмите, чтобы открыть карточку дома и перейти в 3D. Раскладка 36 участков — по плану застройщика.
          </p>
        </div>
        {hideEstateLink ? (
          <a className="v4-pik-btn v4-pik-btn--accent" href="#tipy-poselka">
            <span>Типы домов в Динской ↓</span>
          </a>
        ) : (
          <a className="v4-pik-btn" href={estateHref}>
            <span>Страница посёлка Динская →</span>
          </a>
        )}
      </div>

      {compareList.length > 0 && (
        <div className="v4-gp__compare">
          <div className="v4-gp__cmp-head">
            <b>Сравнение выбранных домов ({compareList.length}/2)</b>
            <button type="button" onClick={() => setCompareCodes([])}>Очистить</button>
          </div>
          <div className="v4-gp__cmp-grid">
            {compareList.map((h) => (
              <a key={h.code} href={`/v4/dom/${h.code}`} className="v4-gp__cmp-item">
                <b>{h.title}</b>
                <span>{formatArea(h.area)} м² · {h.plot || 'участок 4 сот.'} · {formatMillions(h.price)}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
