'use client'

import { useEffect, useRef } from 'react'
import './countryLife.css'

const MOMENTS = [
  {
    id: 'dog',
    title: 'Газон для игр',
    text: 'Открываете калитку во двор, и собака уже бежит за струёй поливалки.',
    image: '/v4/life/dog-lawn.webp',
    alt: 'Зелёный газон во дворе собственного кирпичного дома в солнечный день',
    size: 'tall',
  },
  {
    id: 'bbq',
    title: 'Ужин на террасе',
    text: 'Летом стол для семейного ужина можно накрыть прямо у выхода из кухни.',
    image: '/v4/life/bbq-terrace.webp',
    alt: 'Открытая терраса кирпичного дома с накрытым столом и видом на зелёный сад',
    size: 'wide',
  },
  {
    id: 'garden',
    title: 'Кофе с видом на сад',
    text: 'Для завтрака на воздухе достаточно поставить стол и два стула у дома.',
    image: '/v4/life/garden-morning.webp',
    alt: 'Утренний завтрак и кофе на террасе с видом на участок',
    size: 'compact',
  },
  {
    id: 'kids',
    title: 'С порога во двор',
    text: 'С крыльца удобно встречать гостей и следить, чем заняты дети во дворе.',
    image: '/v4/life/kids-yard.webp',
    alt: 'Уютное кирпичное крыльцо с открытой дверью в светлую гостиную',
    size: 'medium',
  },
] as const

export function CountryLifeStory() {
  const secRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = secRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-inview')
        observer.unobserve(entry.target)
      }
    }, { threshold: 0.16 })
    el.querySelectorAll('[data-life-card]').forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={secRef} className="cl-story" id="zagorodom" aria-labelledby="cl-story-title">
      <div className="cl-story__wrap">
        <div className="cl-story__head">
          <div className="cl-story__title-col">
            <h2 id="cl-story-title" className="cl-story__h2">
              Жизнь <em>за городом</em>
            </h2>
          </div>
          <p className="cl-story__lead">
            Как можно обжить участок вокруг дома. Визуализации сада, крыльца и террасы.
          </p>
        </div>

        <div className="cl-story__grid">
          {MOMENTS.map((m) => (
            <article key={m.id} data-life-card className={`cl-card cl-card--${m.size}`}>
              <div className="cl-card__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.image} alt={m.alt} loading="lazy" decoding="async" />
              </div>
              <div className="cl-card__body">
                <h3>{m.title}</h3>
                <p>{m.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="cl-story__foot">
          <a className="v4-pik-btn v4-pik-btn--accent" href="#karta">
            <span>Выбрать посёлок на карте ↓</span>
          </a>
        </div>
      </div>
    </section>
  )
}
