'use client'

import { useEffect, useRef } from 'react'
import './buyerHero.css'

type BuyerHeroProps = {
  phone?: string | null
  priceFrom?: string
}

/** The day and night treatments share one photograph so the roof and windows stay registered. */
export default function BuyerHero({ phone, priceFrom }: BuyerHeroProps) {
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

  const openMobileMenu = () => {
    document.querySelector<HTMLElement>('.v4-mnav__burger')?.click()
  }

  return (
    <section className="buyer-hero" id="top" ref={scene} aria-labelledby="buyer-hero-title">
      <div className="buyer-hero__landscape">
        <div className="buyer-hero__image">
          <picture>
            <source media="(max-width: 700px)" srcSet="/design/hero-morning-phone.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
      <header className="buyer-hero__nav">
        <a href="/v4" className="buyer-hero__brand" aria-label="Хороший дом — главная">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/v3/logo-white.svg" width="88" height="41" alt="" />
        </a>
        <nav aria-label="Навигация по сайту">
          <a href="#doma">Дома</a>
          <a href="/v4/poselki">Посёлки</a>
          <a href="/v4/ipoteka">Ипотека</a>
          <a href="/v4/o-kompanii">О компании</a>
        </nav>
        <div className="buyer-hero__nav-right">
          <a className="buyer-hero__contact" href={phone ? 'tel:' + phone.replace(/[^\d+]/g, '') : '/v4/kontakty'}>{phone || 'Контакты'}</a>
          <button type="button" className="buyer-hero__menu-btn" onClick={openMobileMenu} aria-label="Открыть меню">
            ☰
          </button>
        </div>
      </header>
      <h1 id="buyer-hero-title" className="buyer-hero__title">Хороший <em>дом</em></h1>
      <div className="buyer-hero__foot">
        <p>Готовые кирпичные дома с участком<br />в собственных посёлках{priceFrom && <span> · от {priceFrom}</span>}</p>
        <a className="buyer-hero__action" href="#doma">Выбрать дом <span aria-hidden="true">↓</span></a>
      </div>
    </section>
  )
}
