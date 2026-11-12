'use client'

/**
 * v3 · экран 0 «Рассвет» (05-Концепция, 06-Брендбук): дом в пейзаже, за ≤2,4 с рассеивается дымка, теплеет свет,
 * гаснет последняя звезда (рифма к звезде Игоря). Внизу — переключатель типов с медленной автосменой (идея Игоря),
 * которая останавливается, как только человек тронул переключатель. Клик по дому ведёт на сам дом.
 * Всё видно без JS; «уменьшить движение» — сразу день, без автосмены.
 */
import { useEffect, useRef, useState } from 'react'

export type DawnSlide = { src: string; phone?: string; title: string; meta: string; href: string; caption: string }

export function HeroDawn({ slides, priceLine, phone, menu }: {
  slides: DawnSlide[]
  priceLine: string
  phone?: string | null
  menu: { label: string; href: string }[]
}) {
  const [i, setI] = useState(0)
  const auto = useRef(true)

  // the dawn itself is pure CSS (v3.css, @keyframes v3-dawn-*): it plays from the very first paint, without JS and without
  // a day→dawn flash after hydration. Here only the slow autoplay of the slides, off for «reduce motion».
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { auto.current = false; return }
    const timer = setInterval(() => { if (auto.current && !document.hidden) setI((n) => (n + 1) % slides.length) }, 6500)
    return () => clearInterval(timer)
  }, [slides.length])

  const pick = (n: number) => { auto.current = false; setI(n) }
  const cur = slides[i] ?? slides[0]
  const tel = phone?.replace(/[^\d+]/g, '')

  return (
    <header className="v3-hero" data-daylight>
      <a className="v3-hero__media" href={cur.href} aria-label={`Открыть: ${cur.title}`}>
        {slides.map((s, k) => (
          <picture key={s.src}>
            {s.phone && <source media="(max-width: 700px)" srcSet={s.phone} />}
            <img src={s.src} alt={s.title} className={k === i ? 'is-on' : ''} fetchPriority={k === 0 ? 'high' : 'low'}
              loading={k === 0 ? 'eager' : 'lazy'} />
          </picture>
        ))}
        <span className="v3-hero__tint" aria-hidden />
        <span className="v3-hero__warm" aria-hidden />
        <span className="v3-hero__mist" aria-hidden />
        <span className="v3-hero__mist v3-hero__mist--2" aria-hidden />
        <span className="v3-hero__star" aria-hidden />
      </a>
      <div className="v3-wrap v3-hero__inner">
        <div className="v3-top">
          <a href="/v3" className="v3-top__logo" aria-label="Хороший дом — на главную">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/v3/logo-white.svg" alt="Хороший дом" width={150} height={70} />
          </a>
          <nav className="v3-top__nav" aria-label="Разделы">
            {menu.map((m) => <a key={m.href} href={m.href}>{m.label}</a>)}
          </nav>
          {tel && <a className="v3-top__tel" href={`tel:${tel}`}>{phone}</a>}
        </div>

        <div className="v3-hero__text">
          <h1 className="v3-hero__title">
            <span className="v3-ln"><span>Дом, в который</span></span>
            <span className="v3-ln"><span><em>хочется</em> возвращаться</span></span>
          </h1>
          <p className="v3-hero__sub">Готовые кирпичные дома на своей земле под Краснодаром{priceLine ? <> · <b>{priceLine}</b></> : null}</p>
          <div className="v3-row">
            <a className="v3-btn v3-btn--main" href="#doma">Выбрать дом</a>
            <a className="v3-btn v3-btn--glass" href="#evf-form">Записаться на показ</a>
          </div>
        </div>

        <div className="v3-hero__bottom">
          {slides.length > 1 && (
            <div className="v3-types" role="group" aria-label="Дома на первом экране">
              {slides.map((s, k) => (
                <button key={s.src} type="button" aria-pressed={k === i} onClick={() => pick(k)} onMouseEnter={() => { auto.current = false }}>
                  {s.title}<b>{s.meta}</b>
                </button>
              ))}
            </div>
          )}
          <span className="v3-hero__cap">{cur.caption}</span>
        </div>
      </div>
    </header>
  )
}
