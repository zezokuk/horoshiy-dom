'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { STATUS_LABEL, formatPrice } from '@/lib/format'
import { EDGE, FILL, PAD, STREET, W, footprint, layout, type GenplanEstate, type Plot } from '@/lib/genplan'
import { carryMorph, morph } from '@/lib/morph'
import { houseTitle, type HouseView } from '@/lib/view'
import { Filters, Ribbon, isFiltered, passes, useFilter } from './GenplanFilters'

// three.js is heavy — load it only when the 3D view is on screen.
const Genplan3D = dynamic(() => import('./Genplan3D'), {
  ssr: false,
  loading: () => <div className="g3 g3--loading">Загружаем 3D-вид посёлка…</div>,
})

// Roof seen from above, lit from the top-left like an architect's plan: 4 slopes of a hip roof in 4 tones.
// Every plot has a real brown roof — the status is shown by the land (green + price / pink hatch / neutral), not the house.
const ROOF_TONES = ['#a47a62', '#8a6250', '#74503f', '#5f4134']
const rand = (n: number) => {
  const x = Math.sin(n * 91.7) * 43758.5453
  return x - Math.floor(x)
}
const millions = (price: number) => `${(price / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`

/** One plot drawn like a master plan: yard, driveway to the street, trees in the back, hip roof from above. */
function Plot2D({ p }: { p: Plot }) {
  const { hx, hy, hw, hh } = footprint(p)
  const [light, mid, dark, ridge] = ROOF_TONES
  const inset = Math.min(hw, hh) / 2
  const cy = hy + hh / 2
  const r1 = hx + inset
  const r2 = hx + hw - inset
  // street side: below the plot when flip, above otherwise
  const front = p.flip ? hy + hh : hy
  const edge = p.flip ? p.y + p.h : p.y
  const drive = { x: hx + hw * 0.62, w: hw * 0.3 }
  const back = p.flip ? p.y + 14 : p.y + p.h - 14
  return (
    <g pointerEvents="none">
      {/* driveway and walkway to the street */}
      <rect x={drive.x} y={Math.min(front, edge)} width={drive.w} height={Math.abs(edge - front)} fill="#ddd6c8" />
      <rect x={hx + hw * 0.2} y={Math.min(front, edge)} width={6} height={Math.abs(edge - front)} fill="#e6e0d3" />
      {/* two trees in the back yard */}
      {[0.34, 0.84].map((fx, i) => {
        const r = 6 + rand(p.n * 3 + i) * 3
        const tx = p.x + p.w * fx + (rand(p.n + i) - 0.5) * 8
        return (
          <g key={i}>
            <circle cx={tx + 2} cy={back + 2} r={r} fill="rgba(31,42,34,.15)" />
            <circle cx={tx} cy={back} r={r} fill="#7f9a68" />
            <circle cx={tx - r * 0.3} cy={back - r * 0.3} r={r * 0.45} fill="#9bb383" />
          </g>
        )
      })}
      {/* house: shadow, then 4 roof slopes */}
      <rect x={hx + 4} y={hy + 5} width={hw} height={hh} rx={2} fill="rgba(31,42,34,.18)" />
      <polygon points={`${hx},${hy} ${hx + hw},${hy} ${r2},${cy} ${r1},${cy}`} fill={light} />
      <polygon points={`${hx},${hy} ${r1},${cy} ${hx},${hy + hh}`} fill={mid} />
      <polygon points={`${hx + hw},${hy} ${hx + hw},${hy + hh} ${r2},${cy}`} fill={dark} />
      <polygon points={`${hx},${hy + hh} ${r1},${cy} ${r2},${cy} ${hx + hw},${hy + hh}`} fill={ridge} />
      <line x1={r1} y1={cy} x2={r2} y2={cy} stroke="rgba(255,240,220,.45)" strokeWidth={1.2} />
      <rect x={hx} y={hy} width={hw} height={hh} rx={1.5} fill="none" stroke="rgba(40,26,18,.35)" strokeWidth={1} />
    </g>
  )
}

type Hover = { n: number; x: number; y: number; w: number; h: number } | null

/** Floating card next to the cursor: photo, status, area, plot, price. */
function HoverCard({ hover, plots, touch }: { hover: Hover; plots: Plot[]; touch: boolean }) {
  if (!hover) return null
  const p = plots.find((pl) => pl.n === hover.n)
  if (!p) return null
  const CW = 260
  const left = hover.x + CW + 24 > hover.w ? hover.x - CW - 16 : hover.x + 16
  const below = hover.y < hover.h * 0.55
  const style = { left: Math.max(8, left), ...(below ? { top: hover.y + 16 } : { bottom: hover.h - hover.y + 16 }) }
  const u = p.unit
  return (
    <div className={`hover-card ${touch ? 'is-touch' : ''}`} style={style} role="tooltip">
      {u ? (
        <>
          {u.photoCard && <img src={u.photoCard} alt="" />}
          <div className="hover-card__body">
            <span className={`badge badge--inline badge--${u.status}`}>{STATUS_LABEL[u.status]}</span>
            <b className="hover-card__price">{formatPrice(u.price)}</b>
            <span>
              Дом {u.area.toLocaleString('ru-RU')} м²{u.mansard ? ` + ${u.mansard} м² мансарда` : ''}
            </span>
            <span className="note">
              {u.title}
              {/* the title already says «уч. 18» (the plot number): here only its size, «4 сот.» */}
              {u.plot ? ` · ${u.plot}` : ''}
            </span>
            {touch ? (
              <Link href={u.href} className="btn btn--green btn--sm" style={{ marginTop: 6 }}>
                Открыть дом →
              </Link>
            ) : (
              <span className="hover-card__cta">Нажмите на дом — откроется его страница</span>
            )}
          </div>
        </>
      ) : (
        <div className="hover-card__body">
          <b>Участок {p.n}</b>
          <span className="note">Сейчас не в продаже. Спросите менеджера о похожих домах.</span>
        </div>
      )}
    </div>
  )
}

function Scheme({
  estate,
  plan,
  active,
  onSelect,
  onHover,
}: {
  estate: GenplanEstate
  plan: ReturnType<typeof layout>
  active: number | null
  onSelect: (n: number, pointer: string, x: number, y: number) => void
  onHover: (n: number | null, x?: number, y?: number) => void
}) {
  const { plots, streets, comm, height } = plan
  // After a tap the browser also fires mousemove/click for compatibility: hover must listen to real mouse pointers only,
  // and the click must know it came from a finger (Safari's click event has no pointerType).
  const pointer = useRef('mouse')
  return (
    <div className="genplan__scroll">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`Схема посёлка ${estate.name}`}>
        <defs>
          <pattern id={`gp-sold-${estate.slug}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#d27c74" strokeWidth="2.2" strokeOpacity=".35" />
          </pattern>
        </defs>
        {/* territory of the village behind a fence */}
        <rect x={0} y={0} width={W} height={height} rx={10} fill="#e9eddf" />
        <rect x={PAD / 2} y={PAD / 2} width={W - PAD} height={height - PAD} rx={8} fill="none" stroke="#c3c9b2" strokeWidth={2} strokeDasharray="2 5" />
        {streets.map((s, i) => (
          <g key={i}>
            <rect x={PAD - 10} y={s.y + 6} width={W - PAD * 2 + 20} height={STREET - 12} rx={6} fill="#e4dfd3" />
            <rect x={PAD - 10} y={s.y + 12} width={W - PAD * 2 + 20} height={STREET - 24} fill="#bfb9ad" />
            <line x1={PAD + 10} x2={W - PAD - 10} y1={s.y + STREET / 2} y2={s.y + STREET / 2} stroke="#f4f1ea" strokeWidth={2} strokeDasharray="14 12" />
            {estate.streets[i] && (
              <g>
                <rect
                  x={W - PAD - 18 - estate.streets[i].length * 7.4}
                  y={s.y + STREET / 2 - 11}
                  width={estate.streets[i].length * 7.4 + 16}
                  height={22}
                  rx={11}
                  fill="#f8f5ee"
                />
                <text x={W - PAD - 10} y={s.y + STREET / 2 + 4.5} textAnchor="end" fontSize={13} fill="#4f5a52" fontFamily="var(--font-sans)">
                  {estate.streets[i]}
                </text>
              </g>
            )}
          </g>
        ))}
        {comm.map((c, i) => (
          <g key={`c${i}`}>
            <rect x={c.x + 3} y={c.y + 4} width={c.w} height={c.h} rx={4} fill="rgba(31,42,34,.15)" />
            <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={4} fill="#d6d3cc" stroke="#a9a49a" />
            <rect x={c.x + 7} y={c.y + 7} width={c.w - 14} height={c.h - 14} rx={2} fill="#e6e3dc" />
            <text x={c.x + c.w / 2} y={c.y + c.h / 2 + 5} textAnchor="middle" fontSize={14} fill="#5d655f" fontFamily="var(--font-sans)">
              Коммерция
            </text>
          </g>
        ))}
        {plots.map((p) => (
          <g
            key={p.n}
            className={`plot ${p.unit ? 'plot--link' : ''} ${active === p.n ? 'is-active' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={p.unit ? `${houseTitle(p.unit)}, ${STATUS_LABEL[p.unit.status]}` : `Участок ${p.n}, нет в продаже`}
            onPointerDown={(ev) => (pointer.current = ev.pointerType)}
            onClick={(ev) => onSelect(p.n, pointer.current, ev.clientX, ev.clientY)}
            onPointerMove={(ev) => ev.pointerType === 'mouse' && onHover(p.n, ev.clientX, ev.clientY)}
            onPointerLeave={(ev) => ev.pointerType === 'mouse' && onHover(null)}
            onKeyDown={(ev) => {
              if (ev.key !== 'Enter' && ev.key !== ' ') return
              ev.preventDefault() // Space must not scroll the page
              const r = (ev.currentTarget as SVGGElement).getBoundingClientRect()
              onSelect(p.n, 'mouse', r.x + r.width / 2, r.y + r.height / 2)
            }}
          >
            <rect className="plot__land" x={p.x} y={p.y} width={p.w} height={p.h} rx={4} fill={FILL[p.status]} stroke={EDGE[p.status]} strokeWidth={p.status === 'free' ? 2.2 : 1.2} />
            {p.status === 'sold' && <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={4} fill={`url(#gp-sold-${estate.slug})`} pointerEvents="none" />}
            <Plot2D p={p} />
            {/* plot number in the back corner, price tag on free houses */}
            <g pointerEvents="none">
              <circle cx={p.x + 13} cy={p.flip ? p.y + 13 : p.y + p.h - 13} r={9} fill="rgba(255,255,255,.85)" />
              <text
                x={p.x + 13}
                y={(p.flip ? p.y + 13 : p.y + p.h - 13) + 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#4f5a52"
                fontFamily="var(--font-sans)"
              >
                {p.n}
              </text>
              {p.unit && p.status === 'free' && (
                <g>
                  <rect x={p.x + p.w / 2 - 34} y={footprint(p).hy + footprint(p).hh / 2 - 12} width={68} height={24} rx={12} fill="#2c3a30" />
                  <text
                    x={p.x + p.w / 2}
                    y={footprint(p).hy + footprint(p).hh / 2 + 4.5}
                    textAnchor="middle"
                    fontSize={12.5}
                    fontWeight={600}
                    fill="#fff"
                    fontFamily="var(--font-sans)"
                  >
                    {millions(p.unit.price)}
                  </text>
                </g>
              )}
            </g>
          </g>
        ))}
      </svg>
    </div>
  )
}

/**
 * stage: the 3D plan as the main scene (reference «HAVN»): filter tiles beside it, a ribbon of free houses over its
 * bottom edge; houses that do not pass the filter go grey in 3D.
 */
export function Genplan({ estate, houses, stage: wantStage = false }: { estate: GenplanEstate; houses: HouseView[]; stage?: boolean }) {
  const plan = useMemo(() => layout(estate.config, houses), [estate.config, houses])
  const [f, setF] = useFilter()
  const freeUnits = useMemo(
    () => plan.plots.flatMap((p) => (p.unit?.status === 'free' ? [{ n: p.n, u: p.unit }] : [])).sort((a, b) => a.u.price - b.u.price),
    [plan],
  )
  // a sold-out estate has nothing to filter: the plain plan (otherwise the scene shrank into the filters' column)
  const stage = wantStage && freeUnits.length > 0
  const shown = useMemo(() => freeUnits.filter((x) => passes(x.u, f)), [freeUnits, f])
  const match = useMemo(() => (stage && isFiltered(f) ? shown.map((x) => x.n) : null), [stage, f, shown])
  const [view, setView] = useState<'3d' | '2d'>('3d')
  // nothing chosen until the visitor chooses: a house shown by itself raised «почему именно этот дом?» (call of 30.10).
  // Only the stage keeps one, its ribbon shows the choice
  const [active, setActive] = useState<number | null>(() => (stage ? (plan.plots.find((p) => p.status === 'free')?.n ?? null) : null))
  const onFail = useCallback(() => setView('2d'), [])
  const plot = plan.plots.find((p) => p.n === active)
  const router = useRouter()
  const viewRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<Hover>(null)
  const [touch, setTouch] = useState(false)
  const armed = useRef<number | null>(null) // house tapped once on a touch screen; the next tap opens it
  const flyRef = useRef<((n: number) => Promise<void>) | null>(null)
  const leaving = useRef(false) // «3D → reality» transition in progress

  // Performance: three.js (≈125 KB gzip) and the scene build only start when the plan is about to be seen
  // (or the visitor presses «Открыть 3D»). Until then a lightweight poster of the same scene is shown.
  const [live, setLive] = useState(false)
  useEffect(() => {
    const el = viewRef.current
    if (!el || live) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLive(true), { rootMargin: '150px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [live])

  // Opening a house: camera flies to its facade, the 3D dissolves into the real photo, then the page opens.
  const openHouse = useCallback(
    async (n: number, u: HouseView) => {
      if (leaving.current) return
      leaving.current = true
      router.prefetch(u.href)
      // the house may live on another subdomain: its page asks for the photo at that address
      const to = new URL(u.href, window.location.href)
      const away = to.origin !== window.location.origin
      const src = u.photo && (away ? new URL(u.photo, to).href : u.photo)
      // warm the big photo while the camera flies: the overlay and the house page reuse it from cache
      if (src) {
        const warm = new Image()
        warm.src = src
        warm.decode().catch(() => {})
      }
      setHover(null)
      setActive(n)
      if (flyRef.current) await flyRef.current(n)
      // hand over to the layout-level transition layer: photo blooms here, the route changes under a curtain,
      // then the photo lands in its slot on the house page (components/MorphLayer.tsx)
      const r = viewRef.current?.getBoundingClientRect()
      if (r && src) morph.set({ src, caption: houseTitle(u), rect: { top: r.top, left: r.left, width: r.width, height: r.height } })
      // swap pages once the curtain is fully opaque
      setTimeout(() => {
        if (!away) return router.push(u.href)
        carryMorph()
        window.location.assign(u.href)
      }, src ? 950 : 0)
    },
    [router],
  )
  const unitAt = useCallback((n: number) => plan.plots.find((p) => p.n === n)?.unit, [plan])

  const onHover = useCallback(
    (n: number | null, x?: number, y?: number) => {
      const r = viewRef.current?.getBoundingClientRect()
      if (!n || !r || x === undefined || y === undefined) return setHover(null)
      setTouch(false)
      armed.current = null
      setHover({ n, x: x - r.left, y: y - r.top, w: r.width, h: r.height })
      const u = unitAt(n)
      if (u) router.prefetch(u.href) // so the click opens the page instantly
    },
    [router, unitAt],
  )

  // Mouse: click on a house opens its page right away.
  // Touch: first tap shows the card with an «Open» button, a second tap on the same house opens it.
  const onSelect = useCallback(
    (n: number, pointer: string, x: number, y: number) => {
      const u = unitAt(n)
      const isTouch = pointer === 'touch' || pointer === 'pen'
      if (u && (!isTouch || armed.current === n)) {
        openHouse(n, u)
        return
      }
      setActive(n)
      if (isTouch) {
        armed.current = n
        const r = viewRef.current?.getBoundingClientRect()
        if (r) setHover({ n, x: x - r.left, y: y - r.top, w: r.width, h: r.height })
        setTouch(true)
        if (u) router.prefetch(u.href)
      }
    },
    [openHouse, router, unitAt],
  )

  return (
    <div className={`genplan ${stage ? 'genplan--stage' : ''}`}>
      <div className="genplan__toolbar">
        <div className="tabs" role="tablist" aria-label="Вид генплана">
          <button role="tab" aria-selected={view === '3d'} className={view === '3d' ? 'is-on' : ''} onClick={() => setView('3d')}>
            3D-вид
          </button>
          <button role="tab" aria-selected={view === '2d'} className={view === '2d' ? 'is-on' : ''} onClick={() => setView('2d')}>
            Схема
          </button>
        </div>
        <div className="legend">
          <span>
            <i style={{ background: FILL.free, border: `1.5px solid ${EDGE.free}` }} />
            Свободен
          </span>
          <span>
            <i style={{ background: FILL.reserved, border: `1.5px solid ${EDGE.reserved}` }} />
            Бронь
          </span>
          <span>
            <i style={{ background: FILL.sold, border: `1.5px solid ${EDGE.sold}` }} />
            Продан
          </span>
          <span>
            <i style={{ background: FILL.na, border: `1.5px solid ${EDGE.na}` }} />
            Нет в продаже
          </span>
        </div>
      </div>

      <div className="genplan__body">
        {stage && <Filters free={freeUnits.map((x) => x.u)} f={f} setF={setF} found={shown.length} />}
      <div className="genplan__view" ref={viewRef} onMouseLeave={() => !touch && setHover(null)}>
        {view === '3d' && !live ? (
          estate.poster ? (
            <button type="button" className="g3 g3--poster" onClick={() => setLive(true)} aria-label="Открыть 3D-вид посёлка">
              <img src={estate.poster} alt="" loading="lazy" decoding="async" />
              <span className="g3__open">Открыть 3D</span>
            </button>
          ) : (
            <button type="button" className="g3 g3--loading" onClick={() => setLive(true)}>
              Открыть 3D-вид посёлка
            </button>
          )
        ) : view === '3d' ? (
          <Genplan3D layout={plan} activeN={active} onSelect={onSelect} onHover={onHover} onFail={onFail} flyRef={flyRef} match={match} />
        ) : (
          <Scheme estate={estate} plan={plan} active={active} onSelect={onSelect} onHover={onHover} />
        )}
        <HoverCard hover={hover} plots={plan.plots} touch={touch} />
        {stage && (
          <Ribbon
            units={shown}
            active={active}
            onPick={(n) => {
              setLive(true)
              setActive(n)
            }}
          />
        )}
      </div>
      </div>

      {!stage && (
      <div className="genplan__tip" aria-live="polite">
        {plot?.unit ? (
          <>
            {plot.unit.photoCard && <img src={plot.unit.photoCard} alt="" />}
            <div style={{ display: 'grid', gap: 4 }}>
              <span className={`badge badge--inline badge--${plot.unit.status}`} style={{ justifySelf: 'start' }}>
                {STATUS_LABEL[plot.unit.status]}
              </span>
              <b>{houseTitle(plot.unit)}</b>
              <span className="note">
                {plot.unit.plot ? `Участок ${plot.unit.plot} · ` : ''}
                {formatPrice(plot.unit.price)}
              </span>
            </div>
            <Link href={plot.unit.href} className="btn btn--green btn--sm">
              Подробнее о доме
            </Link>
          </>
        ) : plot ? (
          <p style={{ gridColumn: '1 / -1' }}>Участок {plot.n} сейчас не в продаже. Спросите менеджера о похожих домах — подберём вариант в этом или соседнем посёлке.</p>
        ) : (
          <p style={{ gridColumn: '1 / -1' }}>Нажмите на дом с ценой, чтобы посмотреть его фото и условия.</p>
        )}
      </div>
      )}
      <p className="genplan__note">Визуализация условная: показывает актуальные предложения и статусы. Точное расположение участков — по генплану застройщика.</p>
    </div>
  )
}
