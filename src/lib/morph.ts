// Tiny store for the «3D plan → house page» transition layer that lives in the root layout,
// so it survives the route change (the plan unmounts, the layer keeps animating — no frozen frame).
// The main site's plan opens a house on krd.…: that is a whole new page and this memory dies with the old one, so the
// transition crosses over in a short-lived cookie (carryMorph). The head script of the layout reads the same cookie to
// put the curtain and the photo up before the first paint of the new page.
import { getShared, removeShared, setShared } from './sharedCookie'

type Rect = { top: number; left: number; width: number; height: number }
export type MorphState = { src: string; caption: string; rect: Rect; carried?: boolean } | null

/** The cookie's name, also in the head script of app/(frontend)/layout.tsx. */
const CARRY = 'hd_morph'

let state: MorphState = null
let landing: { rect: Rect | null } | null = null
const subs = new Set<() => void>()

if (typeof document !== 'undefined') {
  const carried = getShared(CARRY)
  if (carried) {
    removeShared(CARRY)
    try {
      state = { ...JSON.parse(carried), carried: true }
    } catch {}
  }
}

export const morph = {
  get: () => state,
  set(next: MorphState) {
    state = next
    landing = null
    subs.forEach((f) => f())
  },
  subscribe(f: () => void) {
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  },
  /** The house page says where its photo sits. Kept as well as fired: after a whole-page load this may come before the layer listens. */
  land(rect: Rect | null) {
    landing = { rect }
    window.dispatchEvent(new CustomEvent(HOUSE_READY, { detail: rect }))
  },
  landed: () => landing,
}

/** Called right before leaving for another subdomain. */
export function carryMorph() {
  if (state) setShared(CARRY, JSON.stringify(state), 20)
}

/** Fired by the house page once its main photo is decoded; detail = where that photo sits on screen. */
export const HOUSE_READY = 'house:ready'
