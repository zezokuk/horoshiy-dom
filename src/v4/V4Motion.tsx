'use client'

/**
 * v4 · лёгкие движения по прокрутке:
 *  — короткая пролётка «Внутри дома» (сразу из открытой двери 3D, с выходом в белый фон следующей секции);
 *  — плавный сдвиг фоновых слов .v4-ghost;
 *  — появление названия в подвале.
 * Оптимизация: видео-тикер работает ТОЛЬКО пока секция .v4-grow на экране (0% нагрузки вне экрана).
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
      const cleanups: (() => void)[] = []

      gsap.utils.toArray<HTMLElement>('.v4-ghost').forEach((n, k) => {
        gsap.fromTo(
          n,
          { xPercent: k % 2 ? -10 : 3 },
          {
            xPercent: k % 2 ? 2 : -10,
            ease: 'none',
            scrollTrigger: { trigger: n.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.5 },
          },
        )
      })

      const g = document.querySelector<HTMLElement>('.v4-grow')
      if (g) {
        let walkActive = false
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: g,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.35,
            onToggle: (st) => {
              walkActive = st.isActive
            },
          },
        })

        const video = g.querySelector<HTMLVideoElement>('.v4-walk__video')
        const fly = gsap.utils.toArray<HTMLElement>('.v4-fly', g)
        const cards = gsap.utils.toArray<HTMLElement>('.v4-walk__card', g)
        const bars = gsap.utils.toArray<HTMLElement>('.v4-walk__bars s', g)
        const walkUi = g.querySelector('.v4-walk__ui')
        const exitVeil = g.querySelector('.v4-walk__exit')

        if (video || fly.length > 1) {
          if (walkUi) tl.fromTo(walkUi, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0)
          const start = 0
          const arrive: number[] = [0]

          const flyThrough = (list: HTMLElement[]) => {
            list.slice(1).forEach((next, k) => {
              const cur = list[k]
              tl.to(cur.querySelector('img'), { scale: 2.2, duration: 0.45, ease: 'power1.in' })
                .fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18 }, '-=0.18')
                .fromTo(next.querySelector('img'), { scale: 1.25 }, { scale: 1, duration: 0.38, ease: 'power1.out' }, '<')
              arrive.push(tl.duration())
              tl.to({}, { duration: 0.1 })
            })
            tl.to(list[list.length - 1].querySelector('img'), { scale: 1.06, duration: 0.35, ease: 'none' })
            arrive.push(tl.duration())
          }

          if (video) {
            const dur = Number(video.dataset.duration) || 1
            const at = (video.dataset.at || '0').split(',').map(Number)
            video.src = wide ? video.dataset.src! : video.dataset.phone!
            const W = Math.max(0.9, 0.14 * dur) // компактный таймлайн пролётки
            const head = { t: 0 }
            let shown = 0
            const tick = () => {
              if (!walkActive) return
              const diff = head.t - shown
              if (Math.abs(diff) < 0.004) return
              shown += diff * 0.22
              if (Math.abs(video.currentTime - shown) > 0.015 && video.readyState >= 1) video.currentTime = shown
            }
            gsap.ticker.add(tick)
            cleanups.push(() => gsap.ticker.remove(tick))
            tl.fromTo(video, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, start).to(head, { t: dur - 0.05, duration: W, ease: 'none' }, start)

            const ends = [...at.slice(1), dur]
            ends.forEach((e, i) => arrive.push(start + ((at[i] + 0.52 * (e - at[i])) / dur) * W))

            const tail = fly.filter((f) => f.hasAttribute('data-tail'))
            if (tail.length > 1) {
              tl.fromTo(tail[0], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, start + W)
              flyThrough(tail)
            }
          } else {
            flyThrough(fly)
          }

          const total = tl.duration()
          cards.forEach((card, k) => {
            const from = arrive[k] ?? 0
            const to = arrive[k + 1] ?? total
            if (bars[k]) tl.fromTo(bars[k], { scaleX: 0 }, { scaleX: 1, duration: Math.max(0.05, to - from), ease: 'none' }, from)
            tl.fromTo(card, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.09 }, from)
            if (k < cards.length - 1) tl.to(card, { autoAlpha: 0, y: -10, duration: 0.08 }, Math.max(from + 0.1, to - 0.08))
          })

          // Мягкий световой выход из пролётки прямо в однотонный белый фон секции «Типы домов»
          if (exitVeil) {
            tl.fromTo(exitVeil, { opacity: 0 }, { opacity: 1, duration: 0.14 }, Math.max(0, total - 0.1))
          }
        }
      }

      const foot = document.querySelector('.v4-foot__word')
      if (foot) {
        gsap.fromTo(
          foot.querySelectorAll('span'),
          { yPercent: 105 },
          {
            yPercent: 0,
            stagger: 0.04,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: foot, start: 'top 95%', once: true },
          },
        )
      }
      return () => cleanups.forEach((f) => f())
    })
    return () => mm.revert()
  }, [])
  return null
}
