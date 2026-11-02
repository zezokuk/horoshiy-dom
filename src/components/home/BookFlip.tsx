'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ease = (t: number) => t * t * (3 - 2 * t)

export type BookLeaf = { front: ReactNode; back: ReactNode }

/**
 * The book «Хороший дом» with turning pages (03.11, after Shrek's opening; prototype on /preview/book). On a computer the
 * section stops and the page's scroll turns the leaves: the first one is the cover, the book opens and moves to the
 * middle, each next leaf turns around the spine. A leaf's front is the right page, its back the left page of the next
 * spread; `last` lies under all of them. Phones and «reduce motion» get the pages one under another, nothing turns —
 * all the text is in the markup from the start.
 */
export function BookFlip({ leaves, last }: { leaves: BookLeaf[]; last: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = outer.current
    if (!el) return
    const items = [...el.querySelectorAll<HTMLElement>('.bk__leaf')]
    const book = el.querySelector<HTMLElement>('.bk__book')
    const flat = window.matchMedia('(max-width: 759px), (prefers-reduced-motion: reduce)')
    let frame = 0

    const paint = () => {
      frame = 0
      const still = flat.matches || document.documentElement.classList.contains('no-motion')
      el.classList.toggle('is-flat', still)
      if (still) return
      const dist = el.offsetHeight - window.innerHeight
      const p = dist > 0 ? clamp(-el.getBoundingClientRect().top / dist) : 0
      // a short rest at both ends, so the closed cover and the last spread can be read
      const k = clamp((p - 0.06) / 0.88) * items.length
      items.forEach((leaf, i) => {
        const t = ease(clamp(k - i))
        leaf.style.transform = `rotateY(${(-180 * t).toFixed(2)}deg)`
        // the unturned stack has the first leaf on top, the turned one the last
        leaf.style.zIndex = String(t < 0.5 ? items.length - i : i + 1)
        leaf.style.setProperty('--shade', Math.sin(Math.PI * t).toFixed(3))
      })
      book?.style.setProperty('--open', ease(clamp(k)).toFixed(3))
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
  }, [])

  return (
    <div className="bk" ref={outer} style={{ '--n': leaves.length } as CSSProperties}>
      <div className="bk__stage">
        <div className="bk__book">
          <div className="bk__base bk__base--left" aria-hidden />
          <div className="bk__base bk__base--right">{last}</div>
          {leaves.map((leaf, i) => (
            <div key={i} className="bk__leaf" style={{ zIndex: leaves.length - i }}>
              <div className="bk__face bk__face--front">{leaf.front}</div>
              <div className="bk__face bk__face--back">{leaf.back}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
