'use client'
import { useEffect, useRef } from 'react'

export type SketchStep = { title: string; text: string }

/**
 * References 5–6 (20.10): the client's plan lies down, a white line sketch of the house rises from the ground, then the
 * real photo sweeps over the sketch. All three layers are of one real house («Тип 5»: its plan, the line sketch made
 * from its photo by tools/heroassets.py, the photo), so nothing is invented. The scroll drives it: a sticky stage,
 * stage values as CSS variables (--plan, --sk, --ph), clip-path reveals — the Codrops scroll-reveal recipe.
 * Reduced motion: the finished house and all steps at once.
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
      el.style.setProperty('--plan', `${1 - ramp(p, 0.05, 0.32)}`)
      el.style.setProperty('--sk', `${ramp(p, 0.22, 0.52)}`)
      el.style.setProperty('--ph', `${ramp(p, 0.56, 0.9)}`)
      el.dataset.step = p < 0.3 ? '0' : p < 0.6 ? '1' : '2'
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
            <img className="s2h__plan" src="/design/plan-tip5.webp" alt="Планировка проекта «Тип 5»" loading="lazy" decoding="async" />
            <picture>
              <source media="(max-width: 959px)" srcSet="/design/sketch-tip5-900.webp" />
              <img className="s2h__sketch" src="/design/sketch-tip5.webp" alt="" loading="lazy" decoding="async" />
            </picture>
            <picture>
              <source media="(max-width: 959px)" srcSet="/design/hero1-photo-900.webp" />
              <img className="s2h__photo" src="/design/hero1-photo.webp" alt="Построенный дом по проекту «Тип 5»" loading="lazy" decoding="async" />
            </picture>
            <i className="s2h__edge" aria-hidden />
            {caption && <figcaption>{caption}</figcaption>}
          </figure>
        </div>
      </div>
    </section>
  )
}
