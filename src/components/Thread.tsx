'use client'
import { useEffect, useRef } from 'react'

/**
 * One thin gold line through the sections of a page, drawn as you scroll (reference «Loom»; the scroll-driven SVG
 * line drawing recipe from Codrops: stroke-dasharray = the path length, stroke-dashoffset follows the scroll).
 * It keeps to the side margins and crosses the page only at the borders between sections, inside their padding,
 * so it never runs over text. Rebuilt when the page height changes (photos load, accordions open).
 * Reduced motion: the whole line is drawn at once.
 */
export function Thread({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const path = useRef<SVGPathElement>(null)

  useEffect(() => {
    const w = wrap.current,
      s = svg.current,
      p = path.current
    if (!w || !s || !p) return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let len = 0
    let raf = 0

    const draw = () => {
      raf = 0
      if (!len) return
      const top = w.getBoundingClientRect().top
      const progress = Math.min(1, Math.max(0, (innerHeight * 0.8 - top) / w.offsetHeight))
      p.style.strokeDashoffset = still ? '0' : `${len * (1 - progress)}`
    }
    const build = () => {
      const W = w.clientWidth
      const H = w.offsetHeight
      const desk = W >= 960
      // the middle of the side margin: outside the 1280 px container on wide screens, in the gutter on phones
      const side = desk ? Math.max(20, (W - Math.min(W, 1280)) / 2 + 20) : 7
      const xs = [W - side, side]
      const bend = desk ? 56 : 40 // half the height of a crossing; section paddings are 72 / 110 px
      const borders = Array.from(w.children)
        .filter((el) => el.tagName === 'SECTION')
        .map((el) => (el as HTMLElement).offsetTop)
        .filter((y) => y > bend && y < H - bend)
      let side_ = 0
      let d = `M ${xs[0]} 0`
      for (const y of borders) {
        const a = xs[side_]
        const b = xs[1 - side_]
        d += ` L ${a} ${y - bend} C ${a} ${y}, ${b} ${y}, ${b} ${y + bend}`
        side_ = 1 - side_
      }
      d += ` L ${xs[side_]} ${H}`
      s.setAttribute('viewBox', `0 0 ${W} ${H}`)
      p.setAttribute('d', d)
      len = p.getTotalLength()
      p.style.strokeDasharray = `${len}`
      draw()
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }
    const ro = new ResizeObserver(build)
    ro.observe(w)
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      ro.disconnect()
      removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="thread" ref={wrap}>
      {children}
      <svg className="thread__svg" ref={svg} aria-hidden preserveAspectRatio="none">
        <path ref={path} />
      </svg>
    </div>
  )
}
