'use client'

import { useMemo, useState } from 'react'
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
const PAD = 12
const X0 = Math.min(...ALL_PTS.map((q) => q[0])) - PAD
const Y0 = Math.min(...ALL_PTS.map((q) => q[1])) - PAD
const X1 = Math.max(...ALL_PTS.map((q) => q[0])) + PAD
const Y1 = Math.max(...ALL_PTS.map((q) => q[1])) + PAD
const FULL_BOX = { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 }

type Box = { x: number; y: number; w: number; h: number }

function boxForPlots(list: RawPlot[]): Box {
  if (!list.length) return FULL_BOX
  const pts = list.flatMap((p) => p.poly)
  const bx0 = Math.min(...pts.map((q) => q[0])) - 14
  const by0 = Math.min(...pts.map((q) => q[1])) - 14
  const bx1 = Math.max(...pts.map((q) => q[0])) + 14
  const by1 = Math.max(...pts.map((q) => q[1])) + 14
  // сохраняем примерную пропорцию контейнера 2:1
  const bw = bx1 - bx0
  const bh = by1 - by0
  const targetRatio = 2.0
  let w = bw
  let h = bh
  if (w / h < targetRatio) w = h * targetRatio
  else h = w / targetRatio
  const cx = (bx0 + bx1) / 2
  const cy = (by0 + by1) / 2
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

const shortStreet = (s: string) =>
  s.replace('ул. ', '').replace('300-летия Кубанского войска', '300-летия').replace(', уч. ', ' ')

const ptsStr = (pts: number[][]) => pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ')
const centerOf = (pts: number[][]) => ({
  x: pts.reduce((a, b) => a + b[0], 0) / pts.length,
  y: pts.reduce((a, b) => a + b[1], 0) / pts.length,
})

const INFRA_CHIPS = [
  { icon: '🏫', label: 'Школа №3 и садик' },
  { icon: '🛒', label: 'Продуктовые и маркетплейсы' },
  { icon: '🌊', label: 'Река Кочеты рядом' },
  { icon: '🚌', label: 'Выезд к остановке и трассе' },
]

export function DinskayaGenplan({
  houses,
  family = { rate: 6, years: 30, minDown: 20, limit: 6_000_000 },
  estateHref = '/v4/poselok/dinskaya',
  onBackToMap,
}: {
  houses: HouseView[]
  family?: { rate: number; years: number; minDown: number; limit: number }
  estateHref?: string
  onBackToMap?: () => void
}) {
  const [layer, setLayer] = useState<'aerial' | 'scheme'>('aerial')
  const [street, setStreet] = useState<string>('all')
  const [zoomScale, setZoomScale] = useState<number>(1)
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null)
  const [compareCodes, setCompareCodes] = useState<string[]>([])

  const houseByPlot = useMemo(() => {
    const map = new Map<number, HouseView>()
    houses.forEach((h) => {
      if (h.plotNo != null) map.set(h.plotNo, h)
    })
    return map
  }, [houses])

  const streets = useMemo(() => {
    const groups = new Map<string, { plots: RawPlot[]; freeCount: number; center: { x: number; y: number } }>()
    PLOTS.forEach((p) => {
      const g = groups.get(p.street) ?? { plots: [], freeCount: 0, center: { x: 0, y: 0 } }
      g.plots.push(p)
      const h = houseByPlot.get(p.n)
      if (h?.status === 'free') g.freeCount++
      groups.set(p.street, g)
    })
    return [...groups.entries()].map(([name, g]) => {
      const pts = g.plots.flatMap((p) => p.poly)
      return {
        name,
        short: shortStreet(name),
        plots: g.plots,
        freeCount: g.freeCount,
        center: centerOf(pts),
      }
    })
  }, [houseByPlot])

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

  const baseBox = useMemo(() => {
    if (street === 'all') return FULL_BOX
    return boxForPlots(PLOTS.filter((p) => p.street === street))
  }, [street])

  const viewBox = useMemo(() => {
    const cx = baseBox.x + baseBox.w / 2
    const cy = baseBox.y + baseBox.h / 2
    const w = baseBox.w / zoomScale
    const h = baseBox.h / zoomScale
    return `${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`
  }, [baseBox, zoomScale])

  const activePlot = useMemo(() => PLOTS.find((p) => p.n === selectedPlot) ?? null, [selectedPlot])
  const activeHouse = activePlot ? houseByPlot.get(activePlot.n) ?? null : null

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

  const pickStreet = (s: string) => {
    setStreet(s)
    setZoomScale(1)
  }

  const plotStatusOf = (p: RawPlot) => {
    const h = houseByPlot.get(p.n)
    if (h) return h.status
    if (p.crossed) return 'sold'
    return 'pending'
  }

  const selectNearbyFree = () => {
    const freePlots = PLOTS.filter((p) => houseByPlot.get(p.n)?.status === 'free')
    if (freePlots[0]) {
      setSelectedPlot(freePlots[0].n)
      setStreet(freePlots[0].street)
      setZoomScale(1)
    }
  }

  return (
    <div className="v4-gp">
      <div className="v4-gp__toolbar">
        <div className="v4-gp__streets" role="group" aria-label="Группы участков Динской">
          {onBackToMap && (
            <button type="button" className="v4-gp__back" onClick={onBackToMap}>
              ← Все посёлки
            </button>
          )}
          <button
            type="button"
            className={`v4-gp__stab${street === 'all' ? ' is-on' : ''}`}
            onClick={() => pickStreet('all')}
          >
            Вся Динская ({counts.free} в продаже)
          </button>
          {streets.map((st) => (
            <button
              key={st.name}
              type="button"
              className={`v4-gp__stab${street === st.name ? ' is-on' : ''}`}
              onClick={() => pickStreet(st.name)}
            >
              {st.short}
              {st.freeCount > 0 ? <b> · {st.freeCount}</b> : null}
            </button>
          ))}
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

      <div className="v4-gp__stage">
        <svg viewBox={viewBox} className={`v4-gp__svg v4-gp__svg--${layer}`} role="img" aria-label="Интерактивный генплан станицы Динской — 36 участков">
          {layer === 'aerial' && (
            <image
              href="/v4/img/dinskaya-aerial.webp"
              x={FULL_BOX.x}
              y={FULL_BOX.y}
              width={FULL_BOX.w}
              height={FULL_BOX.h}
              preserveAspectRatio="none"
              opacity={0.94}
            />
          )}

          {PLOTS.map((p) => {
            const st = plotStatusOf(p)
            const h = houseByPlot.get(p.n)
            const isSel = selectedPlot === p.n
            const c = centerOf(p.poly)
            return (
              <g
                key={p.n}
                className={`v4-gp__plot v4-gp__plot--${st}${isSel ? ' is-sel' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`Участок ${p.n}, ${h?.title ?? p.type}, ${st === 'free' ? `свободен, ${h ? formatMillions(h.price) : ''}` : st === 'reserved' ? 'бронь' : st === 'sold' ? 'продан' : 'уточнить статус'}`}
                onClick={() => setSelectedPlot(p.n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedPlot(p.n)
                  }
                }}
              >
                <polygon points={ptsStr(p.poly)} />
                {p.house && <polygon className="v4-gp__roof" points={ptsStr(p.house)} />}
                <text x={c.x} y={c.y + 1.2} textAnchor="middle" className="v4-gp__pno">
                  {p.n}
                </text>
              </g>
            )
          })}

          {street === 'all' &&
            streets.map((st) => (
              <g
                key={st.name}
                className="v4-gp__glabel"
                onClick={() => pickStreet(st.name)}
                style={{ cursor: 'pointer' }}
              >
                <rect x={st.center.x - 24} y={st.center.y - 23} width={48} height={7.2} rx={3.6} />
                <text x={st.center.x} y={st.center.y - 18.2} textAnchor="middle">
                  {st.short}
                </text>
              </g>
            ))}
        </svg>

        {/* Зум + / - */}
        <div className="v4-gp__zoom">
          <button type="button" onClick={() => setZoomScale((z) => Math.min(2.6, Number((z * 1.25).toFixed(2))))} aria-label="Приблизить генплан">+</button>
          <button type="button" onClick={() => setZoomScale((z) => Math.max(1, Number((z / 1.25).toFixed(2))))} aria-label="Отдалить генплан">−</button>
          {(zoomScale > 1 || street !== 'all') && (
            <button type="button" onClick={() => { setStreet('all'); setZoomScale(1) }} aria-label="Показать все 36 участков">
              ↺
            </button>
          )}
        </div>

        {/* Стеклянная карточка выбранного участка (по Figma 278-1246) */}
        {activePlot && (
          <aside className="v4-gp__card" aria-live="polite">
            <button type="button" className="v4-gp__close" onClick={() => setSelectedPlot(null)} aria-label="Закрыть карточку участка">
              ✕
            </button>

            {activeHouse?.photoCard || activeHouse?.photo ? (
              <div className="v4-gp__cimg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeHouse.photoCard ?? activeHouse.photo} alt={activeHouse.title} />
                <a className="v4-gp__3dtag" href={`/v4/dom/${activeHouse.code}`}>
                  смотреть 3D-модель
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
                    <p className="v4-gp__cmort">≈ {activeMonthly.toLocaleString('ru-RU')} ₽ в месяц по семейной ипотеке</p>
                  )}
                  <div className="v4-gp__cbtns">
                    <a className="v3-btn v3-btn--main" href={`/v4/dom/${activeHouse.code}`}>
                      Страница дома →
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

      {/* Легенда + инфраструктура (как в Figma 278-1110) */}
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
            Нажмите на зелёный участок — откроется карточка дома. Раскладка 36 участков и углы домов — по точному плану застройщика.
            {layer === 'aerial' ? ' Фон — визуализация окружения станицы.' : ''}
          </p>
        </div>
        <a className="v4-types__all" href={estateHref}>
          Страница посёлка Динская →
        </a>
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
