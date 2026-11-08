'use client'

import { useEffect, useRef } from 'react'
import { Pic } from '@/components/Pic'
import { mainHref } from '@/lib/site'

/**
 * Sketch «Ночь → рассвет одним кадром» (04.11, /preview/night): one photo, two times of day. A star falls once over the
 * night; the scroll fades the night into the morning photo; the words stay in one place in one font. Until the night
 * picture comes from Nano Banana, `night` is left out and the night is the morning photo darkened by CSS.
 */
export function HeroNight({ night, nightPhone }: { night?: string; nightPhone?: string }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const set = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const run = Math.max(1, r.height - innerHeight)
      const p = Math.min(1, Math.max(0, -r.top / run))
      el.style.setProperty('--p', p.toFixed(3))
      el.classList.toggle('is-day', p > 0.5)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(set)
    }
    set()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section ref={ref} className="hn">
      <div className="hn__pane">
        <div className="hn__day">
          <Pic src="/design/hero-morning.webp" phone="/design/hero-morning-phone.webp" alt="Кирпичный дом «Тип 5» утром в дымке" priority />
        </div>
        <div className={`hn__night${night ? '' : ' hn__night--css'}`} aria-hidden>
          <Pic src={night ?? '/design/hero-morning.webp'} phone={nightPhone ?? (night ? undefined : '/design/hero-morning-phone.webp')} alt="" />
          {!night && <i className="hn__windows" />}
          <i className="hn__stars" />
          <i className="hn__star" />
        </div>
        <i className="hn__scrim" aria-hidden />

        <div className="hn__copy">
          <p className="hn__eyebrow">Готовые дома с участком · строим с 2014 года</p>
          <h1 className="hn__title">Хороший дом</h1>
          <p className="hn__slogan">сюда приводят мечты</p>
        </div>

        <div className="hn__bar">
          <p className="hn__lead">Готовые кирпичные дома с участком в 15–40 минутах от Краснодара. Выберите свой и приезжайте на показ.</p>
          <a className="btn btn--green hn__cta" href={mainHref('/catalog')}>
            Выбрать дом
          </a>
        </div>
      </div>
    </section>
  )
}
