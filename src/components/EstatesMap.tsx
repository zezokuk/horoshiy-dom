'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { formatMillions } from '@/lib/format'
import { HINT, bindTouch, bindWheel, useHint } from '@/lib/gestures'
import { estateSale, type EstateView } from '@/lib/view'

// names and places come from the admin: never put them into popup HTML unescaped
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function popup(e: EstateView) {
  const sale = `${estateSale(e)}${e.priceFrom ? ` · от ${formatMillions(e.priceFrom)}` : ''}`
  return `<div class="map-pop">${e.coverCard ? `<img src="${esc(e.coverCard)}" alt="">` : ''}<div><b>${esc(e.name)}</b><span>${esc(e.place)}</span><span>${sale}</span><a href="${esc(
    e.href,
  )}">Смотреть посёлок →</a></div></div>`
}

/**
 * Leaflet + OpenStreetMap tiles (no API key for now; switch to Yandex Maps with a key before launch).
 * Gestures (lib/gestures): two fingers on a touchpad move the map, pinch or Ctrl+wheel zooms, a mouse wheel scrolls
 * the page with a hint; on phones one finger scrolls the page, two fingers move and zoom the map.
 * The map (JS + tiles) loads only when it is about to scroll into view.
 */
export function EstatesMap({ estates, zoom }: { estates: EstateView[]; zoom?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [hint, showHint] = useHint()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!near) return
    let map: import('leaflet').Map | undefined
    let cancelled = false
    const el = ref.current!
    const cleanups: (() => void)[] = []
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled) return
      const list = estates.filter((e) => e.lat !== null && e.lng !== null)
      if (!list.length) return
      map = L.map(el, {
        scrollWheelZoom: false,
        dragging: !L.Browser.mobile,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        attributionControl: true,
      })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        className: 'map-tiles',
      }).addTo(map)
      const markers = list.map((e) =>
        L.marker([e.lat!, e.lng!], {
          icon: L.divIcon({ className: '', html: `<span class="map-pin">${esc(e.name)}</span>`, iconSize: [0, 0] }),
          title: e.name,
        })
          .bindPopup(popup(e), { offset: [0, -34], maxWidth: 260 })
          .addTo(map!),
      )
      if (list.length === 1) map.setView([list[0].lat!, list[0].lng!], zoom ?? 14)
      else map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [70, 70] })
      // the map stays around our estates: zooming out stops at the region, never the whole world
      const area = list.length === 1 ? L.latLng(list[0].lat!, list[0].lng!).toBounds(40000) : L.featureGroup(markers).getBounds()
      map.setMaxBounds(area.pad(1.5))
      map.setMinZoom(Math.max(5, Math.floor(map.getZoom()) - 2))

      const m = map
      cleanups.push(
        bindWheel(el, {
          pan: (dx, dy) => m.panBy([dx, dy], { animate: false }),
          zoom: (e) => m.setZoomAround(m.mouseEventToContainerPoint(e), m.getZoom() - e.deltaY * 0.012, { animate: false }),
          hint: () => showHint(HINT.wheel('карту')),
        }),
        bindTouch(el, () => showHint(HINT.touch('карту'))),
      )
      // Safari (Mac) sends trackpad pinch as gesture events
      let z0 = 0
      const onGestureStart = (e: Event) => {
        e.preventDefault()
        z0 = m.getZoom()
      }
      const onGesture = (e: Event) => {
        e.preventDefault()
        m.setZoom(z0 + Math.log2((e as unknown as { scale: number }).scale), { animate: false })
      }
      el.addEventListener('gesturestart', onGestureStart)
      el.addEventListener('gesturechange', onGesture)
      cleanups.push(() => {
        el.removeEventListener('gesturestart', onGestureStart)
        el.removeEventListener('gesturechange', onGesture)
      })
    })()
    return () => {
      cancelled = true
      cleanups.forEach((c) => c())
      map?.remove()
    }
  }, [near, estates, zoom, showHint])

  return (
    <div className="map-wrap">
      <div ref={ref} className="map" role="region" aria-label="Карта посёлков" />
      <div className={`map-hint ${hint.on ? 'is-on' : ''}`} aria-hidden>
        {hint.text}
      </div>
    </div>
  )
}
