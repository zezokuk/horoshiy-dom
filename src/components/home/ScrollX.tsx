'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * «Сначала вниз, потом вправо» (30.10, Ilya on the ERA reference): on a computer the section stops under the header and
 * the page's vertical scroll moves `track` sideways. The markup stays a plain swipe row until this effect runs, and on
 * phones, with reduced motion or when the row already fits it stays that way, so nothing depends on the script.
 */
export function ScrollX({ track, children }: { track: string; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = outer.current
    const row = el?.querySelector<HTMLElement>(track)
    const stick = el?.firstElementChild as HTMLElement | null
    if (!el || !row || !stick) return
    const wide = window.matchMedia('(min-width: 960px) and (min-height: 620px) and (hover: hover)')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    let dist = 0
    let frame = 0

    const paint = () => {
      frame = 0
      if (!dist) return
      const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / dist))
      row.style.transform = `translate3d(${-p * dist}px, 0, 0)`
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
      el.style.setProperty('--p', p.toFixed(3)) // the page warms up towards the evening as the day goes by (v2.css)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const measure = () => {
      row.style.transform = ''
      el.style.height = ''
      el.classList.remove('is-pinned')
      dist = 0
      if (!wide.matches || calm.matches || document.documentElement.classList.contains('no-motion')) return
      el.classList.add('is-pinned')
      const first = row.firstElementChild?.getBoundingClientRect()
      const last = row.lastElementChild?.getBoundingClientRect()
      const over = first && last ? last.right + first.left - document.documentElement.clientWidth : 0
      if (over < 120) {
        el.classList.remove('is-pinned')
        return
      }
      dist = over
      el.style.height = `${stick.offsetHeight + dist}px`
      paint()
    }
    // Tab into a card that is still off to the right: bring the page to the scroll position that shows it
    const onFocus = (e: FocusEvent) => {
      if (!dist) return
      const card = (e.target as HTMLElement).closest<HTMLElement>(`${track} > *`)
      if (!card) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const x = Math.min(dist, Math.max(0, card.offsetLeft - row.offsetLeft))
      window.scrollTo({ top: top + x, behavior: 'auto' })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(document.documentElement)
    window.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('focusin', onFocus)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      el.removeEventListener('focusin', onFocus)
    }
  }, [track])

  return (
    <div className="sx" ref={outer}>
      <div className="sx__stick">
        {children}
        <span className="sx__bar" aria-hidden>
          <span ref={bar} />
        </span>
      </div>
    </div>
  )
}
