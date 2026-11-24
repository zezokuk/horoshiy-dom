'use client'

/**
 * v4 · «Карта с плашками» — рисунок Ильи 12.11: карта на весь блок, на ней плашки посёлков, справа зелёная карточка
 * с текстом про выбранный посёлок. Карта — Яндекс (JS API 2.1): плашка = метка со своей вёрсткой, выбор плашки
 * плавно подводит карту к посёлку. Если API не загрузился — тот же вид через виджет Яндекса (iframe) без движения.
 * Перед запуском нужен ключ Яндекс Карт: NEXT_PUBLIC_YMAPS_KEY (бесплатный, кабинет разработчика Яндекса).
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export type MapEstate = {
  slug: string; name: string; place: string; lat: number; lng: number
  status: 'selling' | 'soldOut' | 'planned'; sale: string; href: string; cover?: string
  nearby: { label: string; value: string }[]
}
const STATUS = { selling: 'В продаже', soldOut: 'Построен и продан', planned: 'Скоро в продаже' } as const
const KEY = process.env.NEXT_PUBLIC_YMAPS_KEY?.trim()

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Yandex Maps 2.1 ships no types
type Y = any
declare global { interface Window { ymaps?: Y } }

function loadYmaps(key: string): Promise<Y> {
  return new Promise((resolve, reject) => {
    const ready = () => (window.ymaps ? window.ymaps.ready(() => resolve(window.ymaps)) : reject(new Error('ymaps: empty')))
    if (window.ymaps?.ready) return ready()
    let s = document.querySelector<HTMLScriptElement>('script[data-ymaps]')
    if (!s) {
      s = document.createElement('script')
      s.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${encodeURIComponent(key)}`
      s.async = true
      s.dataset.ymaps = '1'
      document.head.appendChild(s)
    }
    s.addEventListener('load', ready)
    s.addEventListener('error', () => reject(new Error('ymaps: load')))
    window.setTimeout(() => reject(new Error('ymaps: timeout')), 9000)
  })
}

const margin = () => (window.innerWidth > 860 ? [70, 450, 60, 60] : [50, 34, 40, 34])

export function EstateMap({ estates }: { estates: MapEstate[] }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const api = useRef<{ map: Y; marks: Y[] } | null>(null)
  const [i, setI] = useState(0)
  const [zoomed, setZoomed] = useState(false) // false — all estates on the screen, true — the chosen one close up
  const [mode, setMode] = useState<'wait' | 'js' | 'frame'>(KEY ? 'wait' : 'frame')
  const [near, setNear] = useState(false)
  const cur = estates[i]

  useEffect(() => {
    const el = box.current
    if (!KEY || !el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: '400px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!KEY || !near || !canvas.current || !estates.length) return
    let dead = false
    let map: Y
    loadYmaps(KEY)
      .then((ymaps) => {
        if (dead || !canvas.current) return
        const touch = window.matchMedia('(pointer: coarse)').matches
        map = new ymaps.Map(
          canvas.current,
          { center: [estates[0].lat, estates[0].lng], zoom: 10, controls: ['zoomControl'], behaviors: touch ? ['multiTouch', 'dblClickZoom'] : ['drag', 'dblClickZoom', 'multiTouch'] },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true },
        )
        // {{ }} escapes HTML: names come from the admin
        const Pin = ymaps.templateLayoutFactory.createClass('<div class="v4-pin {{ properties.cls }}"><i></i>{{ properties.name }}</div>')
        const marks = estates.map((e, k) => {
          const m = new ymaps.Placemark([e.lat, e.lng], { name: e.name, cls: `v4-pin--${e.status}${k === 0 ? ' is-on' : ''}` }, {
            iconLayout: Pin, iconShape: { type: 'Rectangle', coordinates: [[-96, -54], [96, 0]] }, zIndex: k === 0 ? 300 : 200 - k,
          })
          m.events.add('click', () => { setI(k); setZoomed(true) })
          map.geoObjects.add(m)
          return m
        })
        try { map.margin.setDefaultMargin(margin()) } catch { /* older builds: no margin manager */ }
        map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, useMapMargin: true })
        api.current = { map, marks }
        setMode('js')
      })
      .catch(() => { if (!dead) setMode('frame') })
    return () => {
      dead = true
      api.current = null
      try { map?.destroy() } catch { /* already gone */ }
    }
  }, [near, estates])

  // the chosen plaque turns green and the map glides to it
  useEffect(() => {
    const a = api.current
    if (!a || mode !== 'js' || !cur) return
    a.marks.forEach((m, k) => {
      m.properties.set('cls', `v4-pin--${estates[k].status}${k === i ? ' is-on' : ''}`)
      m.options.set('zIndex', k === i ? 300 : 200 - k)
    })
    const opts = { duration: 1100, timingFunction: 'ease-in-out', useMapMargin: true, checkZoomRange: true }
    if (zoomed) a.map.setCenter([cur.lat, cur.lng], 13, opts)
    else a.map.setBounds(a.map.geoObjects.getBounds(), opts)
  }, [i, zoomed, mode, cur, estates])

  const pick = useCallback((k: number) => { setI((k + estates.length) % estates.length); setZoomed(true) }, [estates.length])
  if (!cur) return null

  const pins = estates.map((e) => `${e.lng},${e.lat},pm2gnm`).join('~')
  const frame = `https://yandex.ru/map-widget/v1/?ll=${zoomed ? cur.lng : 39.02}%2C${zoomed ? cur.lat : 45.12}&z=${zoomed ? 13 : 10}&pt=${pins}`

  return (
    <div className="v4-mapbox" ref={box}>
      <div className="v4-plaques" role="group" aria-label="Посёлки на карте">
        {estates.map((e, k) => (
          <button key={e.slug} type="button" className={`v4-plaque v4-plaque--${e.status}`} aria-pressed={zoomed && k === i} onClick={() => pick(k)}>
            <i />{e.name}
          </button>
        ))}
        <button type="button" className="v4-plaque v4-plaque--all" aria-pressed={!zoomed} onClick={() => setZoomed(false)}>Все на карте</button>
      </div>

      <div className="v4-map">
        <div className="v4-map__canvas" ref={canvas} role="region" aria-label="Карта посёлков «Хорошего дома»">
          {mode === 'frame' && <iframe src={frame} title="Посёлки на карте Яндекса" loading="lazy" />}
        </div>

        <aside className="v4-map__card" aria-live="polite">
          <div className="v4-map__in" key={cur.slug}>
            <p className={`v4-map__status v4-map__status--${cur.status}`}><i />{STATUS[cur.status]}</p>
            <div className="v4-map__name">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cur.cover && <img src={cur.cover} alt="" loading="lazy" />}
              <div>
                <h3>{cur.name}</h3>
                <p>{cur.place}</p>
              </div>
            </div>
            <p className="v4-map__sale">{cur.sale}</p>
            {cur.nearby.length > 0 && (
              <ul>{cur.nearby.slice(0, 4).map((n) => <li key={n.label}><span>{n.label}</span><b>{n.value}</b></li>)}</ul>
            )}
            <a className="v4-map__go" href={cur.href}>Смотреть посёлок <span aria-hidden>→</span></a>
          </div>
          <div className="v4-map__pager">
            <button type="button" onClick={() => pick(i - 1)} aria-label="Предыдущий посёлок">←</button>
            <span>{i + 1} / {estates.length}</span>
            <button type="button" onClick={() => pick(i + 1)} aria-label="Следующий посёлок">→</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
