'use client'

import { useEffect, useRef } from 'react'
import './countryLife.css'

const MOMENTS = [
  {
    id: 'dog',
    tag: '01 · Простор участка',
    title: 'Газон, поливалка и счастливая собака',
    text: 'Когда утро начинается не с лифта и парковки во дворе-колодце, а с босых шагов по своей траве.',
    image: '/v4/life/dog-lawn.webp',
    alt: 'Зелёный газон во дворе собственного кирпичного дома в солнечный день',
    speed: -18,
    size: 'tall',
  },
  {
    id: 'bbq',
    tag: '02 · Тёплые вечера',
    title: 'Семейные ужины на своей террасе',
    text: 'Два шага из кухни-гостиной — и накрытый стол на открытой террасе с видом на собственный зелёный сад.',
    image: '/v4/life/bbq-terrace.webp',
    alt: 'Открытая терраса кирпичного дома с накрытым столом и видом на зелёный сад',
    speed: 14,
    size: 'wide',
  },
  {
    id: 'garden',
    tag: '03 · Тишина по утрам',
    title: 'Кофе на крыльце и свой сад',
    text: 'Свои деревья, ухоженный участок, свежий воздух и ни одного соседа за стенкой.',
    image: '/v4/life/garden-morning.webp',
    alt: 'Утренний завтрак и кофе на террасе с видом на участок',
    speed: -12,
    size: 'compact',
  },
  {
    id: 'kids',
    tag: '04 · Спокойствие дома',
    title: 'Уютное крыльцо и закрытый двор',
    text: 'Собственный огороженный участок с парковкой и калиткой: безопасное пространство, где всё под рукой.',
    image: '/v4/life/kids-yard.webp',
    alt: 'Уютное кирпичное крыльцо с открытой дверью в светлую гостиную',
    speed: 18,
    size: 'medium',
  },
] as const

export function CountryLifeStory() {
  const secRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = secRef.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches || document.documentElement.classList.contains('no-motion')) return

    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-life-card]'))
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-inview')
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    )
    cards.forEach((c) => io.observe(c))

    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        if (window.innerWidth < 860) return
        const vh = window.innerHeight || 900
        cards.forEach((card) => {
          const speed = Number(card.dataset.speed || 0)
          const r = card.getBoundingClientRect()
          const progress = Math.max(-1, Math.min(1, (r.top + r.height * 0.5 - vh * 0.5) / (vh * 0.75)))
          card.style.setProperty('--life-y', `${(progress * speed).toFixed(1)}px`)
        })
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section ref={secRef} className="cl-story" id="zagorodom" aria-labelledby="cl-story-title">
      <div className="cl-story__wrap">
        <div className="cl-story__head">
          <div className="cl-story__title-col">
            <p className="v4-num">
              <b>Жизнь за городом</b> · ради чего переезжают в свой дом
            </p>
            <h2 id="cl-story-title" className="cl-story__h2">
              Своя земля. Свои правила. <em>Своя жизнь</em>
            </h2>
          </div>
          <p className="cl-story__lead">
            Покупают не просто квадратные метры кирпича — покупают тихие утра на своей террасе, закрытый зелёный двор для детей и тёплые семейные вечера без городской суеты.
          </p>
        </div>

        <div className="cl-story__grid">
          {MOMENTS.map((m) => (
            <article key={m.id} data-life-card data-speed={m.speed} className={`cl-card cl-card--${m.size}`}>
              <div className="cl-card__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.image} alt={m.alt} loading="lazy" decoding="async" />
                <span className="cl-card__tag">{m.tag}</span>
              </div>
              <div className="cl-card__body">
                <h3>{m.title}</h3>
                <p>{m.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="cl-story__foot">
          <div className="cl-story__pills">
            <span>Участки ИЖС от 4 до 7,5 соток</span>
            <span>Забор, ворота и парковка во дворе</span>
            <span>Тихие жилые улицы без транзита</span>
          </div>
          <a className="v4-pik-btn v4-pik-btn--accent" href="#karta">
            <span>Выбрать посёлок на карте ↓</span>
          </a>
        </div>
      </div>
    </section>
  )
}
