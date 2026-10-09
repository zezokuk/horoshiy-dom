import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Wheel and touch gestures for the estates map and the 3D master plan.
 *
 * A two-finger touchpad scroll and a mouse wheel both arrive as `wheel` events. Over the map / 3D:
 *  - touchpad scroll → pan, the content follows the fingers, the page stays;
 *  - mouse wheel → the page scrolls as usual and a hint explains how to move the map;
 *  - touchpad pinch (Chrome, Edge and Firefox send it as wheel + ctrlKey) or Ctrl+wheel → zoom.
 * A scroll that started elsewhere and runs into the box keeps scrolling the page: a gesture belongs to the element
 * it began over. Events less than GESTURE_GAP ms apart are one gesture, Mac momentum scrolling included.
 *
 * Phones: one finger scrolls the page (with a «two fingers» hint), two fingers move and zoom the map.
 */

export type WheelKind = 'zoom' | 'pan' | 'page'
export const GESTURE_GAP = 250
const MAC_MOUSE_STEP = 4.000244140625

type WheelLike = Pick<WheelEvent, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'deltaMode' | 'deltaX' | 'deltaY'> & { wheelDeltaY?: number }

/** Touchpad or mouse wheel, judged from one event; the strongest signals go first. */
export function classifyWheel(e: WheelLike): WheelKind {
  if (e.ctrlKey || e.metaKey) return 'zoom'
  if (e.deltaMode !== 0) return 'page' // Firefox mouse wheel scrolls by lines
  if (e.deltaX !== 0 && !e.shiftKey) return 'pan' // a mouse wheel only scrolls vertically
  const dy = Math.abs(e.deltaY)
  if (!dy) return 'page'
  const steps = dy / MAC_MOUSE_STEP
  if (Math.abs(steps - Math.round(steps)) < 1e-6) return 'page' // macOS mouse: whole 4.000244140625 steps
  const wd = e.wheelDeltaY ?? 0
  if (wd && wd === -3 * e.deltaY) return 'pan' // macOS touchpad in Chrome and Safari
  if (!Number.isInteger(e.deltaY)) return 'pan' // Windows precision touchpads send fractional deltas
  if (wd && wd % 120 === 0) return 'page' // a classic wheel notch
  return dy < 50 ? 'pan' : 'page'
}

// The current wheel gesture over the whole page: where it began and what it turned out to be.
const gesture = { last: -Infinity, origin: null as EventTarget | null, kind: null as WheelKind | null }
let tracking = false
function track() {
  if (tracking || typeof window === 'undefined') return
  tracking = true
  // capture phase on window: runs before the map's own handler for the same event
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.timeStamp - gesture.last > GESTURE_GAP) {
        gesture.origin = e.target
        gesture.kind = null
      }
      gesture.last = e.timeStamp
    },
    { capture: true, passive: true },
  )
}

/** Wires wheel gestures to a box; `pan` gets the deltas in screen pixels. Returns a cleanup function. */
export function bindWheel(el: HTMLElement, h: { pan: (dx: number, dy: number) => void; zoom: (e: WheelEvent) => void; hint: () => void }) {
  track()
  const onWheel = (e: WheelEvent) => {
    const kind = classifyWheel(e)
    if (kind === 'zoom') {
      e.preventDefault()
      h.zoom(e)
      return
    }
    if (!(gesture.origin instanceof Node) || !el.contains(gesture.origin)) return // started on the page: let it scroll
    // a touchpad gesture stays a pan to the end, even if one fast flick looks like a wheel notch
    gesture.kind = gesture.kind === 'pan' || kind === 'pan' ? 'pan' : 'page'
    if (gesture.kind === 'pan') {
      e.preventDefault()
      h.pan(e.deltaX, e.deltaY)
    } else h.hint()
  }
  el.addEventListener('wheel', onWheel, { passive: false })
  return () => el.removeEventListener('wheel', onWheel)
}

/**
 * Phones: a one-finger drag over the box scrolls the page and shows the hint; with two fingers the page must not
 * scroll (touch-action alone lets two fingers pan the page), so those moves are cancelled here.
 */
export function bindTouch(el: HTMLElement, hint: () => void) {
  let start: { x: number; y: number } | null = null
  let shown = false
  const onStart = (e: TouchEvent) => {
    start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
    shown = false
  }
  const onMove = (e: TouchEvent) => {
    if (e.touches.length >= 2) {
      start = null
      if (e.cancelable) e.preventDefault()
      return
    }
    if (!start || shown) return
    const t = e.touches[0]
    if (Math.abs(t.clientY - start.y) > 12 || Math.abs(t.clientX - start.x) > 12) {
      shown = true
      hint()
    }
  }
  el.addEventListener('touchstart', onStart, { passive: true })
  el.addEventListener('touchmove', onMove, { passive: false })
  return () => {
    el.removeEventListener('touchstart', onStart)
    el.removeEventListener('touchmove', onMove)
  }
}

/** A hint that shows for a moment and hides itself; repeated calls keep it on. The text stays while it fades out. */
export function useHint(ms = 1400) {
  const [hint, setHint] = useState({ text: '', on: false })
  const timer = useRef(0)
  const show = useCallback(
    (text: string) => {
      setHint({ text, on: true })
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setHint((h) => ({ ...h, on: false })), ms)
    },
    [ms],
  )
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return [hint, show] as const
}

export const HINT = {
  wheel: (what: string) => `Двумя пальцами на тачпаде — двигать ${what}, Ctrl + колесо — приблизить`,
  touch: (what: string) => `Двумя пальцами — двигать и приближать ${what}`,
}
