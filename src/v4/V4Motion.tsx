'use client'

/**
 * v4 · движения по Aurus поверх общей обёртки v3 (MotionRoot: строки, шторки на фото, счётчики, плавная прокрутка):
 *  — «картинка в картинке»: маленький кадр растёт на весь экран, слова расходятся в стороны, поверх выходит цитата;
 *  — цифры-факты выезжают слева и справа;
 *  — огромные слова за заголовками плывут вбок вместе с прокруткой;
 *  — название в подвале собирается по буквам.
 * Всё привязано к прокрутке (scrub), закрепление — через CSS sticky. «Уменьшить движение» — всё стоит в финальном виде.
 * Шапка: появляется, когда первый экран пройден (у v2 это делал Shell).
 */
import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function V4Motion() {
  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add({ ok: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 861px)' }, (c) => {
      const { ok, wide } = c.conditions as { ok: boolean; wide: boolean }
      if (!ok) return

      gsap.utils.toArray<HTMLElement>('.v4-ghost').forEach((n, k) => {
        gsap.fromTo(n, { xPercent: k % 2 ? -16 : 4 }, {
          xPercent: k % 2 ? 2 : -16, ease: 'none',
          scrollTrigger: { trigger: n.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        })
      })

      const g = document.querySelector<HTMLElement>('.v4-grow')
      if (g) {
        const [w1, w2] = gsap.utils.toArray<HTMLElement>('.v4-grow__words span', g)
        const away = (dir: number) => (wide ? { xPercent: dir * 70 } : { yPercent: dir * 160 })
        const home = wide ? { xPercent: 0 } : { yPercent: 0 }
        const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: g, start: 'top top', end: 'bottom bottom', scrub: 0.5 } })
          .fromTo(g.querySelector('.v4-grow__frame'), { clipPath: wide ? 'inset(25% 35% 25% 35% round 18px)' : 'inset(35% 14% 35% 14% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.55 }, 0)
          .fromTo(g.querySelector('.v4-grow__frame img'), { scale: 1.16 }, { scale: 1, duration: 0.55 }, 0)
          .fromTo(w1, { autoAlpha: 1, ...home }, { autoAlpha: 0, ...away(-1), duration: 0.34 }, 0.04)
          .fromTo(w2, { autoAlpha: 1, ...home }, { autoAlpha: 0, ...away(1), duration: 0.34 }, 0.04)
          .fromTo(g.querySelector('.v4-grow__num'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.15 }, 0.2)
          .fromTo(g.querySelector('.v4-grow__scrim'), { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.48)
          .fromTo(g.querySelector('.v4-grow__quote'), { autoAlpha: 0, y: 46 }, { autoAlpha: 1, y: 0, duration: 0.24 }, 0.54)
          .to({}, { duration: 0.2 })

        // пролёт: цитата уходит, камера въезжает в дверь кадра, следующий кадр проявляется из приближения
        const fly = gsap.utils.toArray<HTMLElement>('.v4-fly', g)
        if (fly.length > 1) {
          tl.to(g.querySelector('.v4-grow__quote'), { autoAlpha: 0, y: -30, duration: 0.18 })
            .to(g.querySelector('.v4-grow__scrim'), { opacity: 0, duration: 0.18 }, '<')
          fly.slice(1).forEach((next, k) => {
            const cur = fly[k]
            tl.to(cur.querySelector('img'), { scale: 2.6, duration: 0.6, ease: 'power1.in' })
              .fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22 }, '-=0.22')
              .fromTo(next.querySelector('img'), { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'power1.out' }, '<')
              .to({}, { duration: 0.18 })
          })
        }
      }

      gsap.utils.toArray<HTMLElement>('.v4-nums__row').forEach((n, k) => {
        gsap.fromTo(n.querySelector('b'), { xPercent: k % 2 ? 36 : -36, autoAlpha: 0 }, {
          xPercent: 0, autoAlpha: 1, ease: 'none',
          scrollTrigger: { trigger: n, start: 'top 98%', end: 'top 64%', scrub: 0.5 },
        })
      })

      const foot = document.querySelector('.v4-foot__word')
      if (foot) {
        gsap.fromTo(foot.querySelectorAll('span'), { yPercent: 115 }, {
          yPercent: 0, stagger: 0.045, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: foot, start: 'top 94%', once: true },
        })
      }
    })
    return () => mm.revert()
  }, [])
  return null
}
