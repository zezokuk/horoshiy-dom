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
      const cleanups: (() => void)[] = []

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

        // прогулка (Villa Aurelia): цитата уходит, дальше либо видео проматывается прокруткой, либо камера въезжает
        // в дверь кадра и следующий кадр проявляется из приближения. Поверх — полоски комнат и подпись комнаты.
        const video = g.querySelector<HTMLVideoElement>('.v4-walk__video')
        const fly = gsap.utils.toArray<HTMLElement>('.v4-fly', g)
        const cards = gsap.utils.toArray<HTMLElement>('.v4-walk__card', g)
        const bars = gsap.utils.toArray<HTMLElement>('.v4-walk__bars s', g)
        if (video || fly.length > 1) {
          tl.to(g.querySelector('.v4-grow__quote'), { autoAlpha: 0, y: -30, duration: 0.18 })
            .to(g.querySelector('.v4-grow__scrim'), { opacity: 0, duration: 0.18 }, '<')
            .fromTo(g.querySelector('.v4-walk__ui'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, '<')
          const start = tl.duration()
          const arrive: number[] = [start] // момент, когда камера «пришла» в комнату k (в долях таймлайна)
          if (video) {
            const dur = Number(video.dataset.duration) || 1
            const at = (video.dataset.at || '0').split(',').map(Number)
            video.src = wide ? video.dataset.src! : video.dataset.phone!
            const W = 1.1 * at.length // длина прогулки на таймлайне ~ как у кадров
            const head = { t: 0 }
            let shown = 0
            const tick = () => { // мягко догоняем нужную секунду: перемотка видео не дёргается
              shown += (head.t - shown) * 0.18
              if (Math.abs(video.currentTime - shown) > 0.01 && video.readyState >= 1) video.currentTime = shown
            }
            gsap.ticker.add(tick)
            cleanups.push(() => gsap.ticker.remove(tick))
            tl.fromTo(video, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, start)
              .to(head, { t: dur - 0.05, duration: W, ease: 'none' }, start)
            at.slice(1).forEach((s) => arrive.push(start + (s / dur) * W))
            arrive.push(start + W)
          } else {
            fly.slice(1).forEach((next, k) => {
              const cur = fly[k]
              tl.to(cur.querySelector('img'), { scale: 2.6, duration: 0.6, ease: 'power1.in' })
                .fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22 }, '-=0.22')
                .fromTo(next.querySelector('img'), { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'power1.out' }, '<')
              arrive.push(tl.duration())
              tl.to({}, { duration: 0.18 })
            })
            tl.to(fly[fly.length - 1].querySelector('img'), { scale: 1.08, duration: 0.5, ease: 'none' }) // последняя комната — лёгкий шаг вперёд
            arrive.push(tl.duration())
          }
          // комната k: её полоска заполняется, пока идём к следующей; подпись видна от прихода до ухода
          cards.forEach((card, k) => {
            const from = arrive[k] ?? start
            const to = arrive[k + 1] ?? tl.duration()
            if (bars[k]) tl.fromTo(bars[k], { scaleX: 0 }, { scaleX: 1, duration: Math.max(0.05, to - from), ease: 'none' }, from)
            tl.fromTo(card, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.12 }, from)
            if (k < cards.length - 1) tl.to(card, { autoAlpha: 0, y: -12, duration: 0.1 }, Math.max(from + 0.12, to - 0.1))
          })
          tl.to({}, { duration: 0.25 }) // задержка в конце, на террасе
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
      return () => cleanups.forEach((f) => f())
    })
    return () => mm.revert()
  }, [])
  return null
}
