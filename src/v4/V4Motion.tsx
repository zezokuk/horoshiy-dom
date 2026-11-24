'use client'

/**
 * v4 · фирменные движения поверх MotionRoot (Aurus + Чехов + Marvis — золотая середина без перегруза):
 *  — огромные бледные слова .v4-ghost мягко плывут вбок при прокрутке;
 *  — цифры-факты .v4-nums__row выезжают с двух сторон;
 *  — финальная надпись «Хороший дом» в подвале собирается по буквам снизу вверх;
 *  — карточки преимуществ и секции откликаются мягкой сменой ритма.
 */
import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function V4Motion() {
  useEffect(() => {
    if (document.documentElement.classList.contains('no-motion')) return
    const mm = gsap.matchMedia()
    mm.add({ ok: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 861px)' }, (c) => {
      const { ok, wide } = c.conditions as { ok: boolean; wide: boolean }
      if (!ok) return

      // 1. Огромные фоновые слова «Чехов / Aurus» мягко плывут в стороны по прокрутке
      gsap.utils.toArray<HTMLElement>('.v4-ghost').forEach((n, k) => {
        gsap.fromTo(
          n,
          { xPercent: k % 2 ? -14 : 4 },
          {
            xPercent: k % 2 ? 3 : -14,
            ease: 'none',
            scrollTrigger: { trigger: n.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.55 },
          },
        )
      })

      // 2. Цифры-факты выезжают навстречу (приём Aurus, сохранён из прошлой версии Клода)
      gsap.utils.toArray<HTMLElement>('.v4-nums__row').forEach((n, k) => {
        const b = n.querySelector('b')
        if (!b) return
        gsap.fromTo(
          b,
          { xPercent: wide ? (k % 2 ? 5 : -5) : 0, autoAlpha: 0 },
          {
            xPercent: 0,
            autoAlpha: 1,
            ease: 'power2.out',
            scrollTrigger: { trigger: n, start: 'top 95%', end: 'top 66%', scrub: 0.45 },
          },
        )
      })

      // 3. Мягкий наезд закатного финала (рифма к рассвету)
      const finalSec = document.querySelector<HTMLElement>('.v4-final__cinema')
      if (finalSec) {
        gsap.fromTo(
          finalSec,
          { '--final-zoom': 1.07 } as gsap.TweenVars,
          {
            '--final-zoom': 1,
            ease: 'none',
            scrollTrigger: { trigger: finalSec, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
          } as gsap.TweenVars,
        )
      }

      // 4. Название в подвале выезжает по буквам
      const foot = document.querySelector('.v4-foot__word')
      if (foot) {
        gsap.fromTo(
          foot.querySelectorAll('span'),
          { yPercent: 112 },
          {
            yPercent: 0,
            stagger: 0.025,
            duration: 0.65,
            ease: 'power3.out',
            scrollTrigger: { trigger: foot, start: 'top 95%', once: true },
          },
        )
      }
    })
    return () => mm.revert()
  }, [])
  return null
}
