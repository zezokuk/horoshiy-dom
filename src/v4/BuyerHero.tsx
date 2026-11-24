'use client'

import { useEffect, useRef } from 'react'
import './buyerHero.css'

type BuyerHeroProps = {
  priceFrom?: string
}

/** The day and night treatments share one photograph so the roof and windows stay registered. */
export default function BuyerHero({ priceFrom }: BuyerHeroProps) {
  const scene = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = scene.current
    if (!el) return
    const update = () => {
      document.documentElement.classList.toggle('past-hero', el.getBoundingClientRect().top < -88)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      document.documentElement.classList.remove('past-hero')
    }
  }, [])

  return (
    <section className="buyer-hero" id="top" ref={scene} aria-labelledby="buyer-hero-title">
      <div className="buyer-hero__landscape">
        <div className="buyer-hero__image">
          <picture>
            <source media="(max-width: 700px)" srcSet="/design/hero-morning-phone.webp" />
            <img src="/design/hero-morning.webp" width="1920" height="1288" alt="Фасад типового кирпичного дома с участком" fetchPriority="high" />
          </picture>
          <div className="buyer-hero__night" aria-hidden="true" />
          <div className="buyer-hero__sunrise" aria-hidden="true" />
          <div className="buyer-hero__windows" aria-hidden="true">
            <i className="bh-win bh-win--l" />
            <i className="bh-win bh-win--porch" />
            <i className="bh-win bh-win--r" />
            <span className="bh-win-spill" />
          </div>
        </div>
      </div>
      <div className="buyer-hero__stars" aria-hidden="true"><i /></div>
      <div className="buyer-hero__veil" aria-hidden="true" />
      <h1 id="buyer-hero-title" className="buyer-hero__title">Хороший <em>дом</em></h1>
      <div className="buyer-hero__foot">
        <p>Готовые кирпичные дома с участком<br />в наших посёлках под Краснодаром</p>
        <div className="buyer-hero__offer">
          {priceFrom && <span className="buyer-hero__price">от {priceFrom}</span>}
          <a className="buyer-hero__action" href="#doma">Выбрать дом <span aria-hidden="true">↓</span></a>
        </div>
      </div>
    </section>
  )
}
