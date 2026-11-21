'use client'

/**
 * Единая обёртка движения сайта (золотая середина: лёгкий отзывчивый Lenis + 4 фирменных движения без перегруза):
 *   data-move="up"       — мягкое появление снизу (карточки, абзацы, списки)
 *   data-move="lines"    — «Строки поднимаются»: заголовок выезжает из-под маски (безопасно после загрузки шрифтов)
 *   data-move="reveal"   — шторка-раскрытие фотографий (ERA / Aurus)
 *   data-count           — живой набег цифр-фактов
 *   data-move="roof"     — окно-крыша (для v3)
 *   data-parallax        — мягкая глубина
 *
 * Оптимизация: никаких постоянных ResizeObserver(document.body) — ScrollTrigger обновляется один раз после fonts.ready
 * и на resize с дебаунсом; Lenis с быстрым откликом (lerp: 0.135), без ощущения «киселя».
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

type Motion = { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger; lenis: Lenis | null; reduced: boolean }
const MotionContext = createContext<Motion>({ gsap, ScrollTrigger, lenis: null, reduced: false })
export const useMotion = () => useContext(MotionContext)

export const ROOF_CLOSED = 'polygon(50% 34%, 63% 47%, 63% 74%, 37% 74%, 37% 47%)'
export const ROOF_OPEN = 'polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)'
export const ROOF_EXIT = 'polygon(50% 10%, 90% 42%, 90% 92%, 10% 92%, 10% 42%)'

export function MotionRoot({ children, smooth = true }: { children: ReactNode; smooth?: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<Motion>({ gsap, ScrollTrigger, lenis: null, reduced: false })

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('no-motion')
    const finePointer = window.matchMedia('(pointer: fine)').matches
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'on'

    let lenis: Lenis | null = null
    let tick: ((time: number) => void) | null = null
    if (!reduced && finePointer && smooth) {
      // Золотая середина по скроллу (как у Marvis / Lumera): шёлковое торможение без вязкости
      lenis = new Lenis({ autoRaf: false, lerp: 0.135, wheelMultiplier: 0.92, smoothWheel: true })
      lenis.on('scroll', ScrollTrigger.update)
      tick = (time: number) => lenis?.raf(time * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
    }
    setState({ gsap, ScrollTrigger, lenis, reduced })

    let dead = false

    const ctx = gsap.context(() => {
      if (reduced) return

      // 1. Мягкое появление карточек и абзацев снизу
      gsap.utils.toArray<HTMLElement>('[data-move="up"]').forEach((node) => {
        const sib = [...(node.parentElement?.children ?? [])].filter((n) => (n as HTMLElement).dataset.move === 'up')
        gsap.fromTo(
          node,
          { y: 24, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.72,
            ease: 'power3.out',
            clearProps: 'transform',
            delay: Math.min(sib.indexOf(node), 5) * 0.06,
            scrollTrigger: { trigger: node, start: 'top 90%', once: true },
          },
        )
      })

      // 2. Шторка-раскрытие фотографий (фирменный коммерческий приём ERA / Aurus)
      gsap.utils.toArray<HTMLElement>('[data-move="reveal"]').forEach((node) => {
        const sib = [...(node.closest('.v3-strip, .v3-covers, .v4-dom__similar, .v4-estates-grid')?.children ?? [])]
        const i = Math.max(0, sib.findIndex((c) => c.contains(node)))
        gsap.fromTo(
          node,
          { clipPath: 'inset(9% 9% 9% 9% round 16px)' },
          {
            clipPath: 'inset(0% 0% 0% 0% round 16px)',
            duration: 0.95,
            ease: 'power3.out',
            delay: Math.min(i, 4) * 0.06,
            clearProps: 'clipPath',
            scrollTrigger: { trigger: node, start: 'top 92%', once: true },
          },
        )
      })

      // 3. Окно-крыша (используется в v3)
      gsap.utils.toArray<HTMLElement>('[data-move="roof"]').forEach((node) => {
        gsap.fromTo(
          node,
          { clipPath: ROOF_CLOSED },
          {
            clipPath: ROOF_OPEN,
            ease: 'none',
            scrollTrigger: { trigger: node, start: 'top 80%', end: 'top 25%', scrub: 0.6 },
          },
        )
      })

      gsap.utils.toArray<HTMLElement>('[data-move="hero-exit"]').forEach((node) => {
        gsap.fromTo(
          node,
          { clipPath: ROOF_OPEN },
          {
            clipPath: ROOF_EXIT,
            ease: 'none',
            scrollTrigger: { trigger: node.parentElement ?? node, start: 'top top', end: 'bottom top', scrub: 0.4 },
          },
        )
        const inner = node.parentElement?.querySelector('.v3-hero__inner')
        if (inner) {
          gsap.to(inner, {
            autoAlpha: 0,
            y: -40,
            ease: 'none',
            scrollTrigger: { trigger: node.parentElement ?? node, start: 'top top', end: '40% top', scrub: 0.4 },
          })
        }
      })

      // 4. Живые счётчики цифр
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((node) => {
        const to = Number(node.dataset.count)
        if (!Number.isFinite(to)) return
        const tail = (node.textContent ?? '').replace(/^\D*\d+/, '')
        const n = { v: 0 }
        gsap.to(n, {
          v: to,
          duration: 1.25,
          ease: 'power2.out',
          snap: { v: 1 },
          onUpdate: () => {
            node.textContent = `${n.v}${tail}`
          },
          onComplete: () => {
            node.textContent = `${to}${tail}`
          },
          scrollTrigger: { trigger: node, start: 'top 92%', once: true },
        })
      })

      if (finePointer) {
        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((node) => {
          const k = Number(node.dataset.parallax) || 0.14
          gsap.fromTo(
            node,
            { yPercent: -k * 45 },
            {
              yPercent: k * 45,
              ease: 'none',
              scrollTrigger: { trigger: node.parentElement ?? node, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          )
        })
      }

      gsap.utils.toArray<HTMLElement>('[data-daylight]').forEach((node) => {
        ScrollTrigger.create({
          trigger: node,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (st) => document.documentElement.style.setProperty('--daylight', st.progress.toFixed(3)),
        })
      })
    }, el)

    // 5. «Строки поднимаются» — надёжная анимация появления заголовков без ломких масок SplitText
    let linesCtx: gsap.Context | null = null
    const armLines = () => {
      if (dead || reduced) return
      linesCtx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>('[data-move="lines"]').forEach((node) => {
          gsap.fromTo(
            node,
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              duration: 0.72,
              ease: 'power3.out',
              scrollTrigger: { trigger: node, start: 'top 90%', once: true },
            },
          )
        })
      }, el)
      ScrollTrigger.refresh()
    }
    if (document.fonts?.ready) {
      document.fonts.ready.then(armLines)
    } else {
      armLines()
    }

    let resizeTimer = 0
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 240)
    }
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      dead = true
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      linesCtx?.revert()
      ctx.revert()
      if (tick) gsap.ticker.remove(tick)
      lenis?.destroy()
      delete document.documentElement.dataset.motion
      document.documentElement.style.removeProperty('--daylight')
    }
  }, [smooth])

  return (
    <MotionContext.Provider value={state}>
      <div ref={root} className="v3-motion">{children}</div>
    </MotionContext.Provider>
  )
}
