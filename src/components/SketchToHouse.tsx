'use client'
import { useEffect, useRef } from 'react'
import { HandLines, HouseLines } from './HouseLines'

export type SketchStep = { title: string; text: string }

/**
 * References 5–6 (20.10): a hand holds a see-through sheet with the plan of «Тип 5»; the frame of the house is drawn
 * line by line, then the real house sweeps in and the left part stays a drawing on the sheet. All of it is one real
 * house: its plan, lines traced from its photo (components/house-lines-data.ts), the photo with the sky cut out. The scroll
 * drives it: a sticky stage, stage values as CSS variables (--plan, --sk, --ph) — the Codrops scroll-drawing recipe.
 * Reduced motion: the finished picture and all steps at once.
 */
export function SketchToHouse({ steps, caption }: { steps: [SketchStep, SketchStep, SketchStep]; caption?: string }) {
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-still')
      return
    }
    let raf = 0
    const ramp = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)))
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)))
      el.style.setProperty('--plan', `${ramp(p, 0, 0.22)}`)
      el.style.setProperty('--sk', `${ramp(p, 0.24, 0.6)}`)
      el.style.setProperty('--ph', `${ramp(p, 0.62, 0.92)}`)
      el.dataset.step = p < 0.23 ? '0' : p < 0.61 ? '1' : '2'
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    return () => {
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="s2h" ref={root} data-step="0">
      <div className="s2h__sticky">
        <div className="container s2h__in">
          <ol className="s2h__steps">
            {steps.map((s, i) => (
              <li key={s.title} data-i={i}>
                <span>0{i + 1}</span>
                <b>{s.title}</b>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <figure className="s2h__stage">
            <div className="s2h__sheet">
              <img className="s2h__plan" src="/design/plan-tip5-lines.webp" alt="Планировка проекта «Тип 5»" loading="lazy" decoding="async" />
              <HandLines className="s2h__hand" />
            </div>
            <div className="s2h__house">
              <HouseLines className="s2h__lines" />
              <picture>
                <source media="(max-width: 959px)" srcSet="/design/hero1-house-900.webp" />
                <img className="s2h__photo" src="/design/hero1-house.webp" alt="Построенный дом по проекту «Тип 5»" loading="lazy" decoding="async" />
              </picture>
            </div>
            {caption && <figcaption>{caption}</figcaption>}
          </figure>
        </div>
      </div>
    </section>
  )
}
