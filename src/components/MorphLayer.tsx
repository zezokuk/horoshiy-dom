'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { HOUSE_READY, morph, type MorphState } from '@/lib/morph'

type Rect = NonNullable<MorphState>['rect']

/**
 * Transition layer for «3D plan → house page», mounted once in the root layout.
 * 1) bloom: the real photo opens out of the house while a milky curtain covers the old page;
 * 2) the route changes under the curtain — the photo keeps drifting, nothing ever freezes;
 * 3) land: when the house page reports its photo slot, the photo flies into it and the curtain dissolves.
 */
export function MorphLayer() {
  const m = useSyncExternalStore(morph.subscribe, morph.get, () => null)
  // phase and photo rect belong to one transition: a new transition starts from «bloom» at its own rect
  const [t, setT] = useState<{ of: MorphState; phase: 'bloom' | 'land' | 'out'; rect: Rect | null }>({ of: null, phase: 'bloom', rect: null })
  if (t.of !== m) setT({ of: m, phase: 'bloom', rect: m?.rect ?? null })
  const { phase, rect } = t
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (!m) return
    document.documentElement.classList.add('is-morphing')
    const finish = () => {
      // reveal the page's own photo right under the landed copy, then fade the copy out — no gap, no double
      document.documentElement.classList.remove('is-morphing')
      setT((s) => ({ ...s, phase: 'out' }))
      timers.current.push(window.setTimeout(() => morph.set(null), 450))
    }
    const onReady = (e: Event) => {
      const target = (e as CustomEvent<Rect | null>).detail
      if (!target) return finish()
      setT((s) => ({ ...s, rect: target, phase: 'land' }))
      timers.current.push(window.setTimeout(finish, 820))
    }
    window.addEventListener(HOUSE_READY, onReady)
    timers.current.push(window.setTimeout(finish, 4000)) // safety: never keep the curtain if something goes wrong
    return () => {
      window.removeEventListener(HOUSE_READY, onReady)
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [m])

  if (!m || !rect || t.of !== m) return null
  return (
    <div className={`morph morph--${phase}`} aria-hidden>
      <div className="morph__curtain" />
      <div className="morph__photo" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}>
        <img src={m.src} alt="" />
        <div className="morph__caption">
          <span>Так этот дом выглядит вживую</span>
          <b>{m.caption}</b>
        </div>
      </div>
    </div>
  )
}
