// Tiny store for the «3D plan → house page» transition layer that lives in the root layout,
// so it survives the route change (the plan unmounts, the layer keeps animating — no frozen frame).

export type MorphState = { src: string; caption: string; rect: { top: number; left: number; width: number; height: number } } | null

let state: MorphState = null
const subs = new Set<() => void>()

export const morph = {
  get: () => state,
  set(next: MorphState) {
    state = next
    subs.forEach((f) => f())
  },
  subscribe(f: () => void) {
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  },
}

/** Fired by the house page once its main photo is decoded; detail = where that photo sits on screen. */
export const HOUSE_READY = 'house:ready'
