import type { HouseStatus } from './format'
import type { HouseView } from './view'

export type PlotStatus = HouseStatus | 'na'
export type Plot = { n: number; x: number; y: number; w: number; h: number; unit?: HouseView; status: PlotStatus; flip: boolean }
export type Layout = { plots: Plot[]; streets: { y: number }[]; comm: { x: number; y: number; w: number; h: number }[]; height: number }
/** The estate's «Генплан (раскладка)» from the admin: plots per row, where the streets go, commercial buildings. */
export type GenplanConfig = { rows: number[]; road: 'between' | 'below'; commercial: number }
/** What the plan needs to know about an estate (built on the server by genplanEstate in lib/view). */
export type GenplanEstate = { slug: string; name: string; streets: string[]; poster?: string; config: GenplanConfig }

export const FILL: Record<PlotStatus, string> = { free: '#cfe3c9', reserved: '#f3e2b6', sold: '#f2cfc9', na: '#e9e5dc' }
export const EDGE: Record<PlotStatus, string> = { free: '#4f8a5b', reserved: '#d9a441', sold: '#d27c74', na: '#c9c2b2' }

export const W = 1000
export const PAD = 30
export const GAP = 10
export const PLOT_H = 120
export const STREET = 54
const FENCE = 22
const MAX_COLS = 8

/**
 * Validates the JSON typed into the admin. Anything missing or malformed falls back to a grid of up to 6 plots
 * per row sized by «Домов всего», so a new estate gets a working 3D plan before anyone draws its layout.
 * Rows are added when the estate has more houses on the site than plots, so no house ever drops off the plan.
 */
export function genplanConfig(raw: unknown, homes: number, houses: number): GenplanConfig {
  const g = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const rows = Array.isArray(g.rows) ? g.rows.filter((r): r is number => Number.isInteger(r) && r > 0).map((r) => Math.min(r, MAX_COLS)) : []
  const commercial = Number.isInteger(g.commercial) ? Math.min(6, Math.max(0, g.commercial as number)) : 0
  const road = g.road === 'below' ? 'below' : 'between'
  const need = Math.max(1, houses, rows.length ? 0 : Math.min(homes, 60)) // the auto grid stays readable: 60 plots at most
  const cols = rows.length ? Math.max(...rows) : Math.min(6, need)
  let have = rows.reduce((s, r) => s + r, 0)
  while (have < need) {
    const add = Math.min(cols, need - have)
    rows.push(add)
    have += add
  }
  return { rows, road, commercial }
}

/**
 * Schematic master plan built from data: plots in rows, streets between row pairs.
 * A house with «Участок на генплане» set stands on that plot; the rest are spread evenly over the free plots.
 * Plots without a house are «not on sale». The 2D scheme and the 3D view render this same layout, so they always agree.
 */
export function layout(cfg: GenplanConfig, houses: HouseView[]): Layout {
  const { rows, road, commercial } = cfg
  const maxCols = Math.max(...rows)
  const pw = (W - PAD * 2 - GAP * (maxCols - 1)) / maxCols
  const plots: Plot[] = []
  const streets: { y: number }[] = []
  let y = PAD
  let n = 1

  rows.forEach((count, r) => {
    // rows above a street put the house at the bottom edge so it faces the road
    const streetBelow = road === 'below' || r % 2 === 0
    for (let c = 0; c < count; c++) {
      plots.push({ n: n++, x: PAD + c * (pw + GAP), y, w: pw, h: PLOT_H, status: 'na', flip: streetBelow })
    }
    y += PLOT_H
    if (streetBelow) {
      streets.push({ y })
      y += STREET
    } else if (r < rows.length - 1) {
      y += FENCE
    }
  })

  const put = (p: Plot, u: HouseView) => {
    p.unit = u
    p.status = u.status
  }
  const rest: HouseView[] = []
  for (const u of houses) {
    const p = u.plotNo ? plots[u.plotNo - 1] : undefined
    if (p && !p.unit) put(p, u)
    else rest.push(u)
  }
  const total = plots.length
  rest.forEach((u, i) => {
    const idx = Math.min(total - 1, Math.round((i * total) / rest.length + total / rest.length / 2 - 0.5))
    const p = plots[idx].unit ? plots.find((pl) => !pl.unit) : plots[idx]
    if (p) put(p, u)
  })

  const comm = Array.from({ length: commercial }, (_, i) => {
    const cw = (W - PAD * 2 - GAP * (commercial - 1)) / commercial
    return { x: PAD + i * (cw + GAP), y: y + 6, w: cw, h: 70 }
  })
  if (commercial) y += 86

  return { plots, streets, comm, height: y + PAD }
}

/** House footprint inside a plot, shared by 2D and 3D so houses sit in the same place. */
export function footprint(p: Plot) {
  const hw = p.w * 0.62
  const hh = p.h * 0.48
  const hx = p.x + (p.w - hw) / 2
  const hy = p.flip ? p.y + p.h - hh - 30 : p.y + 30 // front yard towards the street
  return { hx, hy, hw, hh }
}
