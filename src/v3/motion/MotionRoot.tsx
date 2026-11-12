'use client'

/**
 * v3 — одна обёртка движения для всего сайта (12.11.2026, брендбук `11-Хороший-дом-с-нуля/06-Брендбук.md`).
 *
 * Оборачиваем страницу один раз: <MotionRoot>…</MotionRoot>. Внутри элементы помечаются атрибутами,
 * обёртка сама находит их и запускает пять фирменных движений:
 *   data-reveal="up"     — появление снизу (карточки, абзацы)
 *   data-reveal="lines"  — «Строки поднимаются»: заголовок выезжает по строкам из-под маски (SplitText)
 *   data-reveal="roof"   — «Окно-крыша»: кадр открывается маской в форме дома из логотипа, по прокрутке
 *   data-parallax="0.15" — «Глубина»: слой едет медленнее (+) или быстрее (−) страницы
 *   data-daylight        — «Свет дня»: пока секция на экране, <html> получает --daylight от 0 до 1
 * «Рассвет» первого экрана — отдельный компонент, он берёт gsap отсюда через useMotion().
 *
 * Правила: всё видно без JS (анимация стартует из видимого состояния только после загрузки),
 * «уменьшить движение» выключает всё, Lenis — только на компьютере с мышью, на телефоне обычная прокрутка.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger, SplitText)

type Motion = { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger; lenis: Lenis | null; reduced: boolean }
const MotionContext = createContext<Motion>({ gsap, ScrollTrigger, lenis: null, reduced: false })
export const useMotion = () => useContext(MotionContext)

/** Маска «дом из логотипа»: 5 точек, у полного кадра столько же — clip-path плавно перетекает. */
export const ROOF_CLOSED = 'polygon(50% 34%, 63% 47%, 63% 74%, 37% 74%, 37% 47%)'
export const ROOF_OPEN = 'polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)'

export function MotionRoot({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<Motion>({ gsap, ScrollTrigger, lenis: null, reduced: false })

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(pointer: fine)').matches
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'on'

    let lenis: Lenis | null = null
    let tick: ((time: number) => void) | null = null
    if (!reduced && finePointer) {
      lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true })
      lenis.on('scroll', ScrollTrigger.update)
      tick = (time: number) => lenis?.raf(time * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
    }
    setState({ gsap, ScrollTrigger, lenis, reduced })

    const splits: SplitText[] = []
    const ctx = gsap.context(() => {
      if (reduced) return

      // fromTo, а не from: конечное состояние задано явно. React в разработке монтирует эффект дважды,
      // и from() во второй раз запомнил бы «невидимый» остаток первого запуска как конечный (баг 12.11).
      gsap.utils.toArray<HTMLElement>('[data-reveal="up"]').forEach((node) => {
        gsap.fromTo(node, { y: 28, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', clearProps: 'transform',
          scrollTrigger: { trigger: node, start: 'top 88%', once: true },
        })
      })

      gsap.utils.toArray<HTMLElement>('[data-reveal="lines"]').forEach((node) => {
        const split = SplitText.create(node, { type: 'lines', mask: 'lines', linesClass: 'v3-line' })
        splits.push(split)
        gsap.fromTo(split.lines, { yPercent: 105 }, {
          yPercent: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out',
          scrollTrigger: { trigger: node, start: 'top 85%', once: true },
        })
      })

      gsap.utils.toArray<HTMLElement>('[data-reveal="roof"]').forEach((node) => {
        gsap.fromTo(node, { clipPath: ROOF_CLOSED }, {
          clipPath: ROOF_OPEN, ease: 'none',
          scrollTrigger: { trigger: node, start: 'top 80%', end: 'top 25%', scrub: 0.6 },
        })
      })

      if (finePointer) {
        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((node) => {
          const k = Number(node.dataset.parallax) || 0.15
          gsap.fromTo(node, { yPercent: -k * 50 }, {
            yPercent: k * 50, ease: 'none',
            scrollTrigger: { trigger: node.parentElement ?? node, start: 'top bottom', end: 'bottom top', scrub: true },
          })
        })
      }

      gsap.utils.toArray<HTMLElement>('[data-daylight]').forEach((node) => {
        ScrollTrigger.create({
          trigger: node, start: 'top bottom', end: 'bottom top',
          onUpdate: (st) => document.documentElement.style.setProperty('--daylight', st.progress.toFixed(3)),
        })
      })
    }, el)

    // шрифты меняют высоту строк — пересчитать точки срабатывания, когда они загрузятся
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      splits.forEach((s) => s.revert())
      ctx.revert()
      if (tick) gsap.ticker.remove(tick)
      lenis?.destroy()
      delete document.documentElement.dataset.motion
      document.documentElement.style.removeProperty('--daylight')
    }
  }, [])

  return (
    <MotionContext.Provider value={state}>
      <div ref={root} className="v3-motion">{children}</div>
    </MotionContext.Provider>
  )
}
