'use client'
import { useEffect, useRef, type ReactNode } from 'react'

// where the line rests (% of the house box): the drawing keeps the left wing and the porch, the photo the brick and window
const REST = 46

/**
 * The «drawing ↔ house» split of variant 4 (references 1 and 5): left of the line the house is a drawing, right of it the
 * real photo. On load the house turns from the drawing into the photo; a mouse moves the line (the house «builds» where
 * you point), a finger drags the knob or taps the house; arrow keys move it too. --x on the box drives both clips (CSS).
 */
export function DraftSplit({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = box.current
    const handle = knob.current
    if (!el || !handle) return
    const area = (el.closest('.hd__wrap') as HTMLElement | null) ?? el
    const stage = (el.closest('.hd__stage') as HTMLElement | null) ?? el
    let x = 100
    let target = 100
    let tau = 0.12 // seconds to cover ~63 % of the way: by time, not by frames, so a slow laptop is not «sticky»
    let raf = 0
    let last = 0
    let drag = false

    const paint = () => {
      el.style.setProperty('--x', `${x.toFixed(2)}%`)
      handle.setAttribute('aria-valuenow', String(Math.round(x)))
    }
    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
      last = now
      x += (target - x) * (1 - Math.exp(-dt / tau))
      if (Math.abs(target - x) < 0.05) {
        x = target
        raf = 0
        last = 0
      } else raf = requestAnimationFrame(tick)
      paint()
    }
    // on phones the box is wider than the screen: keep the line where it can be seen
    const range = () => {
      const b = el.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      return [Math.max(3, ((s.left - b.left) / b.width) * 100 + 4), Math.min(97, ((s.right - b.left) / b.width) * 100 - 4)]
    }
    const go = (t: number, seconds = 0.12) => {
      const [lo, hi] = range()
      target = Math.min(hi, Math.max(lo, t))
      tau = seconds
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const at = (e: MouseEvent) => {
      const b = el.getBoundingClientRect()
      return ((e.clientX - b.left) / b.width) * 100
    }

    let intro = 0
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      x = target = REST
      paint()
    } else {
      paint()
      intro = window.setTimeout(() => go(REST, 0.4), 700) // after the lines have drawn themselves
    }

    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || drag) go(at(e))
    }
    const leave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') go(REST, 0.3)
    }
    const down = (e: PointerEvent) => {
      drag = true
      handle.setPointerCapture(e.pointerId)
    }
    const up = () => {
      drag = false
    }
    const tap = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('a')) go(at(e)) // a tap (not a scroll) on the house moves the line there
    }
    const key = (e: KeyboardEvent) => {
      const d = e.key === 'ArrowLeft' ? -5 : e.key === 'ArrowRight' ? 5 : 0
      if (!d) return
      e.preventDefault()
      go(target + d)
    }
    area.addEventListener('pointermove', move)
    area.addEventListener('pointerleave', leave)
    handle.addEventListener('pointerdown', down)
    handle.addEventListener('pointerup', up)
    handle.addEventListener('pointercancel', up)
    handle.addEventListener('keydown', key)
    el.addEventListener('click', tap)
    return () => {
      clearTimeout(intro)
      cancelAnimationFrame(raf)
      area.removeEventListener('pointermove', move)
      area.removeEventListener('pointerleave', leave)
      handle.removeEventListener('pointerdown', down)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', up)
      handle.removeEventListener('keydown', key)
      el.removeEventListener('click', tap)
    }
  }, [])

  return (
    <div className="hx__house" ref={box} style={{ ['--x' as string]: '100%' }}>
      {children}
      <div
        ref={knob}
        className="hx__handle"
        role="slider"
        tabIndex={0}
        aria-label="Чертёж или построенный дом"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={100}
      >
        <i>Чертёж</i>
        <b aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6 3 12l6 6M15 6l6 6-6 6" />
          </svg>
        </b>
        <i>Дом</i>
      </div>
    </div>
  )
}
