'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatMillions } from '@/lib/format'
import type { HouseView } from '@/lib/view'
import { DinskayaGenplan } from '@/v4/DinskayaGenplan'

export type FlowEstate = {
  slug: string
  name: string
  place: string
  lat: number
  lng: number
  status: 'selling' | 'soldOut' | 'planned'
  homes: number | null
  free: number
  priceFrom: number | null
  sale: string
  href: string
  cover?: string
  types: string[]
  nearby: { label: string; value: string }[]
}

const STATUS_LABEL = { selling: 'В продаже', soldOut: 'Построен и продан', planned: 'Скоро в продаже' } as const
const KEY = process.env.NEXT_PUBLIC_YMAPS_KEY

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Yandex Maps 2.1 ships no types
type Y = any

function loadYmaps(): Promise<Y> {
  return new Promise((resolve, reject) => {
    const ready = () => (window.ymaps ? window.ymaps.ready(() => resolve(window.ymaps)) : reject(new Error('ymaps: empty')))
    if (window.ymaps?.ready) return ready()
    let s = document.querySelector<HTMLScriptElement>('script[data-ymaps]')
    if (!s) {
      s = document.createElement('script')
      s.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU${KEY ? `&apikey=${KEY}` : ''}`
      s.async = true
      s.dataset.ymaps = '1'
      document.head.appendChild(s)
    }
    s.addEventListener('load', ready)
    s.addEventListener('error', () => reject(new Error('ymaps: load')))
    window.setTimeout(() => reject(new Error('ymaps: timeout')), 5500)
  })
}

/**
 * Разводим координаты пинов для обзорного масштаба Яндекс.Карты,
 * чтобы близкие посёлки в Новой Адыгее и Козете («Красная 39», «Дружбы 43», «Южный ветер», «Калина»)
 * никогда не налезали друг на друга бутербродом.
 */
function spreadLatLng(slug: string, lat: number, lng: number): [number, number] {
  switch (slug) {
    case 'dinskaya':
      return [45.225, 39.235]
    case 'novovelichkovskaya':
      return [45.275, 38.84]
    case 'krasnaya-39':
      return [45.055, 38.815]
    case 'druzhby-43':
      return [45.055, 39.045]
    case 'yuzhnyy-veter':
      return [44.955, 38.795]
    case 'kalina':
      return [44.955, 39.035]
    default:
      return [lat, lng]
  }
}

/** Разнесённые экранные координаты для векторной карты Кубани — ноль пересечений */
function projectPin(slug: string, lat: number, lng: number) {
  switch (slug) {
    case 'novovelichkovskaya':
      return { x: 28, y: 24 }
    case 'dinskaya':
      return { x: 73, y: 30 }
    case 'krasnaya-39':
      return { x: 28, y: 63 }
    case 'druzhby-43':
      return { x: 56, y: 63 }
    case 'yuzhnyy-veter':
      return { x: 28, y: 80 }
    case 'kalina':
      return { x: 56, y: 80 }
    default: {
      const x = ((lng - 38.76) / (39.34 - 38.76)) * 74 + 13
      const y = (1 - (lat - 44.94) / (45.32 - 44.94)) * 68 + 16
      return { x: Math.min(84, Math.max(14, x)), y: Math.min(84, Math.max(16, y)) }
    }
  }
}

export function MapGenplanFlow({
  estates,
  dinskayaHouses,
  family,
}: {
  estates: FlowEstate[]
  dinskayaHouses: HouseView[]
  family: { rate: number; years: number; minDown: number; limit: number }
}) {
  const defaultIdx = Math.max(0, estates.findIndex((e) => e.slug === 'dinskaya'))
  const [view, setView] = useState<'map' | 'genplan'>('map')
  const [activeIdx, setActiveIdx] = useState<number>(defaultIdx)
  const [mapMode, setMapMode] = useState<'wait' | 'js' | 'vector'>('wait')

  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<{ map: Y; marks: Y[] } | null>(null)
  const [near, setNear] = useState(false)

  const cur = estates[activeIdx] ?? estates[0]

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: '400px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (view !== 'map' || !near || !canvasRef.current || !estates.length) return
    let dead = false
    let map: Y
    loadYmaps()
      .then((ymaps) => {
        if (dead || !canvasRef.current) return
        const touch = window.matchMedia('(pointer: coarse)').matches
        map = new ymaps.Map(
          canvasRef.current,
          { center: [45.11, 39.02], zoom: 10, controls: ['zoomControl'], behaviors: touch ? ['multiTouch', 'dblClickZoom'] : ['drag', 'dblClickZoom', 'multiTouch'] },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true },
        )
        const Pin = ymaps.templateLayoutFactory.createClass(
          '<div class="v4-ypin {{ properties.cls }}"><i></i><div><b>{{ properties.name }}</b><span>{{ properties.sub }}</span></div></div>',
        )
        const marks = estates.map((e, k) => {
          const sub = e.status === 'selling' ? `${e.free} в продаже` : e.status === 'planned' ? 'скоро' : 'проданы'
          const coords = spreadLatLng(e.slug, e.lat, e.lng)
          const m = new ymaps.Placemark(
            coords,
            { name: e.name, sub, cls: `v4-ypin--${e.status}${k === activeIdx ? ' is-on' : ''}` },
            { iconLayout: Pin, iconShape: { type: 'Rectangle', coordinates: [[-95, -52], [95, 4]] }, zIndex: k === activeIdx ? 300 : 200 - k },
          )
          m.events.add('mouseenter', () => setActiveIdx(k))
          m.events.add('click', () => {
            setActiveIdx(k)
            if (e.slug === 'dinskaya') setView('genplan')
          })
          map.geoObjects.add(m)
          return m
        })
        try {
          map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: [54, 88, 64, 88] })
        } catch {
          // ignore
        }
        apiRef.current = { map, marks }
        setMapMode('js')
      })
      .catch(() => {
        if (!dead) setMapMode('vector')
      })
    return () => {
      dead = true
      apiRef.current = null
      try {
        map?.destroy()
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- монтируем карту один раз при переключении в режим map
  }, [view, near, estates])

  useEffect(() => {
    const a = apiRef.current
    if (!a || mapMode !== 'js') return
    a.marks.forEach((m, k) => {
      m.properties.set('cls', `v4-ypin--${estates[k].status}${k === activeIdx ? ' is-on' : ''}`)
      m.options.set('zIndex', k === activeIdx ? 300 : 200 - k)
    })
  }, [activeIdx, mapMode, estates])

  const openEstate = useCallback(
    (k: number) => {
      setActiveIdx(k)
      const target = estates[k]
      if (target?.slug === 'dinskaya') setView('genplan')
    },
    [estates],
  )

  if (!cur) return null

  const dinskayaFree = dinskayaHouses.filter((h) => h.status === 'free').length

  const switcher = (
    <div className="v4-mflow__tabs v4-pik-bar" role="tablist" aria-label="Режим карты и посёлки">
      <button
        type="button"
        role="tab"
        aria-selected={view === 'map'}
        className={`v4-pik-btn v4-pik-btn--map${view === 'map' ? ' is-dark' : ''}`}
        onClick={() => setView('map')}
      >
        <span>Карта посёлков ({estates.length})</span>
        <i className="v4-pik-mapdot" aria-hidden />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'genplan'}
        className={`v4-pik-btn${view === 'genplan' ? ' v4-pik-btn--accent' : ''}`}
        onClick={() => setView('genplan')}
      >
        <span>Генплан КП «Динская» со спутника · 36 участков ({dinskayaFree} свободно)</span>
      </button>
      {view === 'map' &&
        estates.map((e, k) => (
          <button
            key={e.slug}
            type="button"
            className={`v4-pik-btn${k === activeIdx ? ' is-dark' : ''}`}
            onClick={() => openEstate(k)}
          >
            <span>{e.name}</span>
          </button>
        ))}
    </div>
  )

  if (view === 'genplan') {
    return (
      <div className="v4-mflow" ref={boxRef}>
        {switcher}
        <DinskayaGenplan houses={dinskayaHouses} family={family} onBackToMap={() => setView('map')} />
      </div>
    )
  }

  return (
    <div className="v4-mflow" ref={boxRef}>
      {switcher}
      {/* Поле карты: Яндекс Карты + мгновенный векторный слой как запасной */}
      <div className="v4-mflow__box">
        <div className="v4-mflow__ymap" ref={canvasRef} />

        {mapMode !== 'js' && (
          <div className="v4-mflow__vec" role="region" aria-label="Карта посёлков под Краснодаром">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="v4-mflow__river" aria-hidden>
              <path d="M-2,52 C22,48 40,54 62,50 C80,46 92,52 104,49" fill="none" stroke="#c5d7e0" strokeWidth="1.6" />
              <ellipse cx="44" cy="46" rx="10" ry="7" fill="rgba(255,255,255,0.22)" />
              <text x="44" y="46.8" textAnchor="middle" fill="rgba(255,255,255,0.88)" fontSize="3.2" fontWeight="600">
                Краснодар
              </text>
            </svg>
            <div className="v4-mflow__wm" aria-hidden>
              <span>наши</span>
              <span>посёлки</span>
            </div>
            {estates.map((e, k) => {
              const pt = projectPin(e.slug, e.lat, e.lng)
              const isSel = k === activeIdx
              return (
                <button
                  key={e.slug}
                  type="button"
                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                  className={`v4-ypin v4-ypin--${e.status}${isSel ? ' is-on' : ''}`}
                  onMouseEnter={() => setActiveIdx(k)}
                  onFocus={() => setActiveIdx(k)}
                  onClick={() => openEstate(k)}
                >
                  <i />
                  <div>
                    <b>{e.name}</b>
                    <span>{e.status === 'selling' ? `${e.free} в продаже` : e.status === 'planned' ? 'скоро' : 'проданы'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="v4-mflow__hint">
          <span>Наведите на посёлок для справки · Нажмите на Динскую, чтобы открыть генплан 36 участков</span>
        </div>
      </div>

      {/* Нижняя белая информационная полоса (по Figma 278-985) */}
      <div className="v4-mflow__strip" aria-live="polite">
        <div className="v4-mflow__sleft">
          <div className="v4-mflow__stitle">
            <h3>{cur.name}</h3>
            <span className={`v3-status v4-mflow__badge v4-mflow__badge--${cur.status}`}>
              <i />
              {STATUS_LABEL[cur.status]}
            </span>
          </div>
          <p className="v4-mflow__smeta">
            {cur.place}
            {cur.homes ? ` · ${cur.homes} домов` : ''}
            {cur.status === 'selling' ? `, ${cur.free} в продаже` : ''}
            {cur.priceFrom && cur.status === 'selling' ? ` · от ${formatMillions(cur.priceFrom)}` : ''}
          </p>
          {cur.types.length > 0 && (
            <div className="v4-mflow__stypes" aria-label="Типы домов в посёлке">
              {cur.types.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          )}
        </div>

        <div className="v4-mflow__sright">
          {cur.nearby.length > 0 && (
            <ul className="v4-mflow__snear">
              {cur.nearby.slice(0, 3).map((n) => (
                <li key={n.label}>
                  <span>{n.label}</span>
                  <b>{n.value}</b>
                </li>
              ))}
            </ul>
          )}
          <div className="v4-mflow__scta">
            {cur.slug === 'dinskaya' ? (
              <button type="button" className="v4-pik-btn v4-pik-btn--accent" onClick={() => setView('genplan')}>
                <span>Открыть генплан Динской (36 участков) →</span>
              </button>
            ) : (
              <a className="v4-pik-btn v4-pik-btn--accent" href={cur.href}>
                <span>Смотреть посёлок →</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
