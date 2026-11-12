'use client'

/**
 * v3 · первый экран — ровно по схеме референсов (ERA, Aurus, Lumera), 12.11 после «пересмотри рефы и сделай чётко»:
 *  — фото на весь экран, дом внизу кадра, заголовок в небе;
 *  — ERA: название узкой антиквой капителью по центру + строка, разнесённая влево и вправо
 *    («A place ··· to return to» → «Дом, в который ··· хочется возвращаться», фраза клиента);
 *  — Lumera: при загрузке буквы поднимаются по очереди, фото чуть отъезжает;
 *  — при прокрутке заголовок уходит вверх быстрее фото, фото медленно приближается (ERA).
 * Загрузка — чистый CSS (без мигания), прокрутка — GSAP scrub. «Уменьшить движение» — всё стоит.
 */
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const NAME = 'ХОРОШИЙ ДОМ'

export function HeroScene({ photo, photoPhone, priceLine, phone }: { photo: string; photoPhone: string; priceLine: string; phone?: string | null }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const st = { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.4 }
      gsap.to(el.querySelector('.v3-hero2__title'), { yPercent: -70, ease: 'none', scrollTrigger: st })
      gsap.to(el.querySelector('.v3-hero2__photo img'), { scale: 1.12, yPercent: 6, ease: 'none', scrollTrigger: st })
    }, el)
    return () => mm.revert()
  }, [])

  const tel = phone?.replace(/[^\d+]/g, '')
  return (
    <header className="v3-hero2" ref={root}>
      <div className="v3-hero2__photo">
        <picture>
          <source media="(max-width: 860px)" srcSet={photoPhone} />
          <img src={photo} alt="Кирпичный дом «Хорошего дома»" fetchPriority="high" />
        </picture>
      </div>
      <div className="v3-wrap v3-hero2__top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href="/v3" aria-label="На главную"><img src="/v3/logo-white.svg" alt="Хороший дом" width={118} height={55} /></a>
        <div className="v3-row">
          {tel && <a className="v3-hero2__tel" href={`tel:${tel}`}>{phone}</a>}
          <a className="v3-btn v3-btn--glass v3-hero2__btn" href="#doma">Выбрать дом</a>
        </div>
      </div>
      <div className="v3-hero2__title">
        <h1 aria-label="Хороший дом — дом, в который хочется возвращаться">
          <span className="v3-hero2__name" aria-hidden>
            {[...NAME].map((ch, i) => <span key={i} style={{ animationDelay: `${0.25 + i * 0.045}s` }}>{ch === ' ' ? ' ' : ch}</span>)}
          </span>
          <span className="v3-hero2__split" aria-hidden><span>Дом, в который</span><i /><span>хочется возвращаться</span></span>
        </h1>
      </div>
      <div className="v3-wrap v3-hero2__bottom">
        <p>Готовые кирпичные дома под Краснодаром{priceLine ? <> · <b>{priceLine}</b></> : null}</p>
        <a className="v3-hero2__down" href="#doma" aria-label="Смотреть дома">↓</a>
      </div>
    </header>
  )
}
