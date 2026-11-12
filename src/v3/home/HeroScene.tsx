'use client'

/**
 * v3 · первый экран по референсам Ильи (12.11, после «звезда непонятна, экран перегружен»):
 *  — ERA: на белой странице крупный заголовок и дом в рамке; при прокрутке кадр раскрывается на весь экран;
 *  — Aurus: когда кадр раскрыт, поверх фото выплывают три крупные цифры, свет чуть меняется;
 *  — Lumera: минимум текста — логотип, телефон, одна кнопка, заголовок.
 * Сцена — position: sticky внутри высокого блока, GSAP только тянет значения по прокрутке (без перехвата прокрутки).
 * Телефон и «уменьшить движение»: без сцены — фото, заголовок и цифры просто стоят друг под другом.
 */
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export type HeroStat = { value: string; label: string }

export function HeroScene({ photo, photoPhone, stats, phone }: { photo: string; photoPhone: string; stats: HeroStat[]; phone?: string | null }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
      el.classList.add('is-scene')
      const st = { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.5 }
      const tl = gsap.timeline({ scrollTrigger: { ...st, onUpdate: (s) => el.classList.toggle('is-full', s.progress > 0.42) } })
      tl.fromTo('.v3-scene__frame', { clipPath: 'inset(40% 20% 5% 20% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', duration: 0.55 }, 0)
        .fromTo('.v3-scene__frame img', { scale: 1.18, filter: 'saturate(.8) brightness(1.04) sepia(.12)' }, { scale: 1, filter: 'saturate(1) brightness(1) sepia(0)', ease: 'none', duration: 0.55 }, 0)
        .to('.v3-scene__head', { yPercent: -60, autoAlpha: 0, ease: 'none', duration: 0.3 }, 0.05)
        .fromTo('.v3-scene__shade', { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.25 }, 0.4)
        .fromTo('.v3-scene__stat', { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.07, ease: 'power2.out', duration: 0.25 }, 0.55)
        .fromTo('.v3-scene__go', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, 0.75)
      return () => { el.classList.remove('is-scene', 'is-full') }
    }, el)
    return () => mm.revert()
  }, [])

  const tel = phone?.replace(/[^\d+]/g, '')
  return (
    <header className="v3-scene" ref={root}>
      <div className="v3-scene__pin">
        <div className="v3-scene__frame">
          <picture>
            <source media="(max-width: 860px)" srcSet={photoPhone} />
            <img src={photo} alt="Кирпичный дом «Хорошего дома»" fetchPriority="high" />
          </picture>
          <span className="v3-scene__shade" aria-hidden />
        </div>
        <div className="v3-wrap v3-scene__top">
          <a href="/v3" aria-label="Хороший дом — на главную" className="v3-scene__logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/v3/logo.svg" alt="Хороший дом" width={128} height={60} className="is-dark" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/v3/logo-white.svg" alt="" width={128} height={60} className="is-light" />
          </a>
          <div className="v3-row">
            {tel && <a className="v3-scene__tel" href={`tel:${tel}`}>{phone}</a>}
            <a className="v3-btn v3-btn--main v3-scene__topbtn" href="#doma">Выбрать дом</a>
          </div>
        </div>
        <div className="v3-wrap v3-scene__head">
          <h1 className="v3-scene__title"><span className="v3-ln"><span>Дом, в который</span></span><span className="v3-ln"><span><em>хочется</em> возвращаться</span></span></h1>
        </div>
        <div className="v3-wrap v3-scene__stats">
          {stats.map((s) => <div key={s.label} className="v3-scene__stat"><b>{s.value}</b><span>{s.label}</span></div>)}
          <a className="v3-btn v3-btn--glass v3-scene__go" href="#doma">Смотреть дома ↓</a>
        </div>
      </div>
    </header>
  )
}
