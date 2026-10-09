import { describe, expect, it } from 'vitest'
import { genplanConfig, layout } from '@/lib/genplan'
import type { HouseView } from '@/lib/view'

const house = (code: string, plotNo: number | null = null, status: HouseView['status'] = 'free') => ({ code, status, plotNo }) as unknown as HouseView

describe('genplanConfig', () => {
  it('keeps a valid layout from the admin', () => {
    expect(genplanConfig({ rows: [6, 6], road: 'below', commercial: 3 }, 12, 4)).toEqual({ rows: [6, 6], road: 'below', commercial: 3 })
  })
  it('makes a grid from «Домов всего» when there is no layout (a new estate)', () => {
    expect(genplanConfig(null, 14, 3).rows).toEqual([6, 6, 2])
    expect(genplanConfig('garbage', 0, 2).rows).toEqual([2])
  })
  it('adds rows when there are more houses than plots, so none drops off the plan', () => {
    expect(genplanConfig({ rows: [4] }, 0, 7).rows).toEqual([4, 3])
  })
  it('ignores broken values', () => {
    const c = genplanConfig({ rows: [5, -1, 'x', 40], road: 'sideways', commercial: 99 }, 0, 0)
    expect(c).toEqual({ rows: [5, 8], road: 'between', commercial: 6 })
  })
})

describe('layout', () => {
  it('puts a house with «Участок на генплане» on that plot', () => {
    const plan = layout(genplanConfig({ rows: [5, 5] }, 10, 2), [house('a', 7), house('b', 2, 'sold')])
    expect(plan.plots[6].unit?.code).toBe('a')
    expect(plan.plots[1].unit?.code).toBe('b')
    expect(plan.plots[1].status).toBe('sold')
    expect(plan.plots.filter((p) => p.unit)).toHaveLength(2)
  })
  it('spreads the rest over free plots and never loses a house', () => {
    const many = Array.from({ length: 9 }, (_, i) => house(`h${i}`))
    const plan = layout(genplanConfig({ rows: [5, 5] }, 10, 9), [house('fixed', 1), ...many])
    expect(plan.plots.filter((p) => p.unit)).toHaveLength(10)
    expect(plan.plots[0].unit?.code).toBe('fixed')
  })
  it('a plot number taken twice or out of range falls back to a free plot', () => {
    const plan = layout(genplanConfig({ rows: [3] }, 3, 3), [house('a', 2), house('b', 2), house('c', 99)])
    expect(plan.plots.filter((p) => p.unit)).toHaveLength(3)
  })
})
