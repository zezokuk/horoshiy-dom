'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { goal } from '@/components/Metrika'
import { formatArea, formatMillions } from '@/lib/format'

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
  singleHouse?: {
    code: string
    title: string
    area: number
    plot: string | null
    price: number
    href: string
  }
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

/** Экранный сдвиг соседних пинов ТОЛЬКО на обзорном масштабе (сами координаты всегда честные) */
function overviewOffset(slug: string): [number, number] {
  switch (slug) {
    case 'druzhby-43':
      return [-38, -28]
    case 'krasnaya-39':
      return [38, 22]
    case 'kalina':
      return [46, -18]
    case 'yuzhnyy-veter':
      return [-46, 22]
    default:
      return [0, 0]
  }
}

function projectPin(slug: string, lat: number, lng: number) {
  switch (slug) {
    case 'novovelichkovskaya':
      return { x: 26, y: 22 }
    case 'dinskaya':
      return { x: 74, y: 28 }
    case 'druzhby-43':
      return { x: 26, y: 54 }
    case 'krasnaya-39':
      return { x: 52, y: 60 }
    case 'yuzhnyy-veter':
      return { x: 27, y: 78 }
    case 'kalina':
      return { x: 54, y: 80 }
    default: {
      const x = ((lng - 38.76) / (39.34 - 38.76)) * 74 + 13
      const y = (1 - (lat - 44.94) / (45.32 - 44.94)) * 68 + 16
      return { x: Math.min(84, Math.max(14, x)), y: Math.min(84, Math.max(16, y)) }
    }
  }
}

function ctaFor(e: FlowEstate) {
  if (e.singleHouse) {
    return {
      primaryHref: e.singleHouse.href,
      primaryLabel: 'Открыть дом →',
      secondaryHref: e.href,
      secondaryLabel: 'О локации',
      subtitle: `${e.place} · 1 готовый дом: ${e.singleHouse.title}, ${formatArea(e.singleHouse.area)} м² · ${formatMillions(e.singleHouse.price)}`,
      hint: `Локация «${e.name}» · Нажмите на «${e.name}» ещё раз, чтобы открыть фотографии и планировку дома`,
    }
  }
  if (e.status === 'planned') {
    return {
      primaryHref: e.href,
      primaryLabel: 'Узнать о старте продаж →',
      subtitle: `${e.place} · Скоро старт продаж`,
      hint: `Посёлок «${e.name}» · Нажмите на «${e.name}» ещё раз, чтобы узнать о старте продаж`,
    }
  }
  if (e.status === 'soldOut' || e.free === 0) {
    return {
      primaryHref: e.href,
      primaryLabel: 'Смотреть построенный посёлок →',
      subtitle: `${e.place} · ${e.homes ? `${e.homes} домов` : 'Все дома'} построены и проданы`,
      hint: `Посёлок «${e.name}» · Нажмите на «${e.name}» ещё раз, чтобы посмотреть реализованный посёлок`,
    }
  }
  return {
    primaryHref: e.href,
    primaryLabel: e.slug === 'dinskaya' || e.free > 1 ? 'Смотреть посёлок и генплан →' : 'Смотреть посёлок →',
    hook:
      e.slug === 'dinskaya'
        ? `У реки Кочеты · ${e.free} готовых домов${e.priceFrom ? ` · от ${formatMillions(e.priceFrom)}` : ''}`
        : `${e.place} · ${e.free} в продаже${e.priceFrom ? ` · от ${formatMillions(e.priceFrom)}` : ''}`,
    subtitle: `${e.place} · ${e.homes ?? e.free} участков, ${e.free} в продаже${e.priceFrom ? ` · от ${formatMillions(e.priceFrom)}` : ''}`,
    hint: `Посёлок «${e.name}» · Нажмите на «${e.name}» ещё раз или на карточку, чтобы открыть посёлок и генплан`,
  }
}

export function MapGenplanFlow({ estates }: { estates: FlowEstate[] }) {
  const defaultIdx = Math.max(0, estates.findIndex((e) => e.slug === 'dinskaya'))
  const [activeIdx, setActiveIdx] = useState<number>(defaultIdx)
  const [zoomedSlug, setZoomedSlug] = useState<string | null>(null)
  const [mapMode, setMapMode] = useState<'wait' | 'js' | 'vector'>('wait')

  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<{ map: Y; marks: Y[] } | null>(null)
  const zoomedSlugRef = useRef<string | null>(null)
  const wasZoomedRef = useRef(false)
  const [near, setNear] = useState(false)

  useEffect(() => {
    zoomedSlugRef.current = zoomedSlug
  }, [zoomedSlug])

  const cur = estates[activeIdx] ?? estates[0]
  const zoomedEstate = estates.find((e) => e.slug === zoomedSlug) ?? null

  const focusEstate = useCallback(
    (k: number) => {
      const target = estates[k]
      if (!target) return
      setActiveIdx(k)
      if (zoomedSlugRef.current === target.slug) {
        window.location.assign(ctaFor(target).primaryHref)
        return
      }
      zoomedSlugRef.current = target.slug
      setZoomedSlug(target.slug)
      goal('v4_map_estate_zoom', { slug: target.slug })
    },
    [estates],
  )

  const resetZoom = useCallback(() => {
    zoomedSlugRef.current = null
    setZoomedSlug(null)
  }, [])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: '400px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!near || !canvasRef.current || !estates.length) return
    let dead = false
    let map: Y
    loadYmaps()
      .then((ymaps) => {
        if (dead || !canvasRef.current) return
        const touch = window.matchMedia('(pointer: coarse)').matches
        map = new ymaps.Map(
          canvasRef.current,
          { center: [45.11, 39.02], zoom: 10, controls: ['zoomControl'], behaviors: touch ? ['multiTouch'] : ['drag'] },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true, minZoom: 9, maxZoom: 14 },
        )
        const Pin = ymaps.templateLayoutFactory.createClass(
          '<div class="v4-ypin {{ properties.cls }}"><i></i><div><b>{{ properties.name }}</b><span>{{ properties.sub }}</span></div></div>',
        )
        const marks = estates.map((e, k) => {
          const sub = e.status === 'selling' ? `${e.free} в продаже` : e.status === 'planned' ? 'скоро' : 'проданы'
          const m = new ymaps.Placemark(
            [e.lat, e.lng],
            { name: e.name, sub, cls: `v4-ypin--${e.status}${k === activeIdx ? ' is-on' : ''}` },
            {
              iconLayout: Pin,
              iconShape: { type: 'Rectangle', coordinates: [[-96, -30], [96, 30]] },
              iconOffset: overviewOffset(e.slug),
              zIndex: k === activeIdx ? 300 : 200 - k,
            },
          )
          m.events.add('mouseenter', () => setActiveIdx(k))
          m.events.add('click', () => focusEstate(k))
          map.geoObjects.add(m)
          return m
        })
        try {
          map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: [58, 92, 68, 92] })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, estates])

  useEffect(() => {
    const a = apiRef.current
    if (!a || mapMode !== 'js') return
    a.marks.forEach((m, k) => {
      m.properties.set('cls', `v4-ypin--${estates[k].status}${k === activeIdx ? ' is-on' : ''}`)
      m.options.set('zIndex', k === activeIdx ? 300 : 200 - k)
    })
  }, [activeIdx, mapMode, estates])

  useEffect(() => {
    const a = apiRef.current
    if (!a || mapMode !== 'js') return
    if (zoomedSlug) {
      wasZoomedRef.current = true
      const zEst = estates.find((e) => e.slug === zoomedSlug)
      a.marks.forEach((m) => {
        m.options.set('iconOffset', [0, 0])
      })
      if (zEst) {
        try {
          a.map.setCenter([zEst.lat, zEst.lng], 13, { duration: 420, checkZoomRange: true })
        } catch {
          // ignore
        }
      }
    } else if (wasZoomedRef.current) {
      wasZoomedRef.current = false
      a.marks.forEach((m, k) => {
        m.options.set('iconOffset', overviewOffset(estates[k].slug))
      })
      try {
        a.map.setBounds(a.map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: [58, 92, 68, 92], duration: 380 })
      } catch {
        // ignore
      }
    }
  }, [zoomedSlug, mapMode, estates])

  if (!cur) return null

  const zPt = zoomedEstate ? projectPin(zoomedEstate.slug, zoomedEstate.lat, zoomedEstate.lng) : null
  const curCta = ctaFor(cur)
  const zoomCta = zoomedEstate ? ctaFor(zoomedEstate) : null

  return (
    <div className="v4-mflow" ref={boxRef}>
      <div className="v4-mflow__box">
        <div className="v4-mflow__ymap" ref={canvasRef} />

        {mapMode !== 'js' && (
          <div className="v4-mflow__vec" role="region" aria-label="Карта наших посёлков">
            <div
              className="v4-mflow__vec-stage"
              style={
                zPt
                  ? {
                      transformOrigin: `${zPt.x}% ${zPt.y}%`,
                      transform: 'scale(1.85)',
                    }
                  : undefined
              }
            >
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="v4-mflow__river" aria-hidden>
                <path d="M-2,52 C22,48 40,54 62,50 C80,46 92,52 104,49" fill="none" stroke="rgba(235, 224, 204, 0.42)" strokeWidth="1.6" />
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
                    className={`v4-ypin v4-ypin--${e.status}${isSel ? ' is-on' : ''}${zoomedEstate ? ' is-zoomed' : ''}`}
                    onMouseEnter={() => setActiveIdx(k)}
                    onFocus={() => setActiveIdx(k)}
                    onClick={() => focusEstate(k)}
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
          </div>
        )}

        {zoomedEstate && zoomCta && (
          <>
            <button type="button" className="v4-mflow__reset" onClick={resetZoom}>
              ← Все посёлки
            </button>
            <div className="v4-mflow__zoom-cta v4-mflow__zoom-cta--rich" aria-live="polite">
              {zoomedEstate.cover && (
                <a className="v4-mflow__zthumb" href={zoomCta.primaryHref} tabIndex={-1} aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={zoomedEstate.cover} alt="" />
                </a>
              )}
              <div className="v4-mflow__zinfo">
                <p className="v4-mflow__zmeta">{'hook' in zoomCta && zoomCta.hook ? zoomCta.hook : zoomCta.subtitle}</p>
                <h4>
                  <a className="v4-mflow__title-link" href={zoomCta.primaryHref}>
                    {zoomedEstate.name}
                  </a>
                </h4>
                <a className="v4-pik-btn v4-pik-btn--accent v4-mflow__zbtn" href={zoomCta.primaryHref}>
                  <span>{zoomCta.primaryLabel}</span>
                </a>
              </div>
            </div>
          </>
        )}

        <div className="v4-mflow__hint">
          <span>
            {zoomCta
              ? zoomCta.hint
              : 'Наведите на посёлок для справки · Нажмите на пин, чтобы приблизить; нажмите ещё раз — открыть посёлок'}
          </span>
        </div>
      </div>

      <div className="v4-mflow__strip" aria-live="polite">
        <div className="v4-mflow__sleft">
          <div className="v4-mflow__stitle">
            <h3>
              <a className="v4-mflow__title-link" href={curCta.primaryHref}>
                {cur.name}
              </a>
            </h3>
            <span className={`v3-status v4-mflow__badge v4-mflow__badge--${cur.status}`}>
              <i />
              {STATUS_LABEL[cur.status]}
            </span>
          </div>
          <p className="v4-mflow__smeta">{curCta.subtitle}</p>
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
            {curCta.secondaryHref && curCta.secondaryLabel && (
              <a className="v4-pik-btn" href={curCta.secondaryHref}>
                <span>{curCta.secondaryLabel}</span>
              </a>
            )}
            <a className="v4-pik-btn v4-pik-btn--accent" href={curCta.primaryHref}>
              <span>{curCta.primaryLabel}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
