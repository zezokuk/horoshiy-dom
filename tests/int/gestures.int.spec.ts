import { describe, expect, it } from 'vitest'
import { classifyWheel } from '@/lib/gestures'

// Real devices' wheel events (Chrome/Edge/Safari/Firefox). CDP can't fake wheelDeltaY or deltaMode,
// so these rules are covered here and the browser wiring in tools/gesturetest.py.
const ev = (o: Partial<Parameters<typeof classifyWheel>[0]>) =>
  classifyWheel({ ctrlKey: false, metaKey: false, shiftKey: false, deltaMode: 0, deltaX: 0, deltaY: 0, ...o })

describe('classifyWheel', () => {
  it('pinch on a touchpad and Ctrl+wheel zoom', () => {
    expect(ev({ ctrlKey: true, deltaY: -3.2 })).toBe('zoom')
    expect(ev({ ctrlKey: true, deltaY: 100, wheelDeltaY: -120 })).toBe('zoom')
  })
  it('Windows mouse wheel scrolls the page', () => {
    expect(ev({ deltaY: 100, wheelDeltaY: -120 })).toBe('page')
    expect(ev({ deltaY: -125, wheelDeltaY: 120 })).toBe('page') // 125% display scaling
    expect(ev({ deltaY: 300, wheelDeltaY: -360 })).toBe('page') // fast spin, several notches at once
  })
  it('Firefox line-mode wheel scrolls the page', () => {
    expect(ev({ deltaMode: 1, deltaY: 3 })).toBe('page')
  })
  it('macOS mouse (4.000244140625 steps) scrolls the page', () => {
    expect(ev({ deltaY: 4.000244140625, wheelDeltaY: -12 })).toBe('page')
    expect(ev({ deltaY: -12.000732421875, wheelDeltaY: 36 })).toBe('page')
  })
  it('macOS touchpad pans', () => {
    expect(ev({ deltaY: 4, wheelDeltaY: -12 })).toBe('pan')
    expect(ev({ deltaY: 1, wheelDeltaY: -3 })).toBe('pan')
  })
  it('Windows precision touchpad pans', () => {
    expect(ev({ deltaY: 12.5 })).toBe('pan')
    expect(ev({ deltaY: 7, wheelDeltaY: -8 })).toBe('pan')
  })
  it('any horizontal component means a touchpad, unless it is Shift+wheel', () => {
    expect(ev({ deltaX: 6, deltaY: 15, wheelDeltaY: -120 })).toBe('pan')
    expect(ev({ deltaX: 100, deltaY: 0, shiftKey: true, wheelDeltaY: 0 })).toBe('page')
  })
})
