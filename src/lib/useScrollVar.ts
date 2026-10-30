'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Writes how far an element has travelled up the screen into its CSS variable --p (0…1): 0 while its top is below `from`,
 * 1 once it reaches `to` (both are shares of the screen's height). The drawn lines of the home page are all CSS on top of
 * this. With motion switched off --p stays 1, so everything is simply drawn.
 */
export function useScrollVar(ref: RefObject<HTMLElement | SVGElement | null>, from = 0.85, to = 0.35) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('no-motion')) {
      el.style.setProperty('--p', '1')
      return
    }
    let frame = 0
    const paint = () => {
      frame = 0
      const h = window.innerHeight
      const p = (h * from - el.getBoundingClientRect().top) / (h * (from - to))
      el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    paint()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref, from, to])
}
