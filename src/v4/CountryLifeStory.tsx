'use client'

import { useEffect, useRef, useState } from 'react'
import { goal } from '@/components/Metrika'
import './countryLife.css'

type LifeMoment = {
  id: string
  tag: string
  hint?: string
  title: string
  text: string
  image: string
  alt: string
  speed: number
  size: 'tall' | 'wide' | 'compact' | 'medium'
  storyEyebrow: string
  storyTitle: string
  storyEm: string
  storyLead: string
  storyFact: string
  storyCta: string
}

const MOMENTS: readonly LifeMoment[] = [
  {
    id: 'dog',
    tag: '01 · Простор участка',
    hint: 'Мечтаете о собаке?',
    title: 'Газон, поливалка и счастливая собака',
    text: 'Когда утро начинается не с лифта и парковки во дворе-колодце, а с босых шагов по своей траве.',
    image: '/v4/life/dog-lawn.webp',
    alt: 'Дети и золотистый ретривер на зелёном газоне собственного кирпичного дома',
    speed: -18,
    size: 'tall',
    storyEyebrow: 'В своём доме можно позволить себе всё',
    storyTitle: 'Хотите большую собаку?',
    storyEm: 'Начните со своего двора',
    storyLead:
      'В городской квартире мечту о ретривере откладывают годами: тесно в коридоре, лифт по утрам и прогулки вдоль парковки. На своих сотках достаточно просто открыть дверь на террасу — и выпустить друга бегать по траве.',
    storyFact: 'Участки ИЖС от 4 до 7,5 соток · закрытый забор по периметру уже готов',
    storyCta: 'Подобрать дом с участком →',
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
    storyEyebrow: 'В своём доме можно позволить себе всё',
    storyTitle: 'Ужины и гости до темноты —',
    storyEm: 'без брони столика и соседей за стеной',
    storyLead:
      'Тёплый южный вечер, запах гриля, большой стол на собственной террасе и разговоры без оглядки на часы. Из кухни-гостиной во двор ведёт отдельный выход.',
    storyFact: 'Просторные кухни-гостиные до 27 м² с прямым выходом на террасу',
    storyCta: 'Смотреть дома с террасой →',
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
    storyEyebrow: 'В своём доме можно позволить себе всё',
    storyTitle: 'Собственный сад, шезлонги',
    storyEm: 'и абсолютная тишина утром',
    storyLead:
      'Посадить черешню или лаванду под окном, поставить качели для детей или бассейн на лето — на своей земле правила устанавливаете только вы.',
    storyFact: 'Собственная земля ИЖС · прописка, газ и 15 кВт электричества',
    storyCta: 'Выбрать готовый дом →',
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
    storyEyebrow: 'В своём доме можно позволить себе всё',
    storyTitle: 'Своя парковка у крыльца —',
    storyEm: 'забудьте про круги вокруг двора в 22:00',
    storyLead:
      'Ворота, калитка и бетонированное место под автомобиль уже входят в участок. Дети спокойно играют во дворе, а сумки из багажника до кухни — пять шагов.',
    storyFact: 'Готовые жилые улицы в Динской и Новой Адыгее без сквозного проезда',
    storyCta: 'Посмотреть дома в продаже →',
  },
]

export function CountryLifeStory() {
  const secRef = useRef<HTMLElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeMoment = MOMENTS.find((m) => m.id === activeId) ?? null

  useEffect(() => {
    if (!activeId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId])

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
            <article
              key={m.id}
              data-life-card
              data-speed={m.speed}
              className={`cl-card cl-card--${m.size} cl-card--interactive`}
              role="button"
              tabIndex={0}
              aria-label={`${m.title} — открыть историю`}
              onClick={() => {
                setActiveId(m.id)
                goal(`v4_life_${m.id}`)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveId(m.id)
                  goal(`v4_life_${m.id}`)
                }
              }}
            >
              <div className="cl-card__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.image} alt={m.alt} decoding="async" />
                <span className="cl-card__tag">{m.tag}</span>
                {m.hint ? (
                  <span className="cl-card__hint">
                    <i aria-hidden />
                    {m.hint}
                  </span>
                ) : (
                  <span className="cl-card__plus" aria-hidden>
                    +
                  </span>
                )}
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

      {activeMoment && (
        <div
          className="cl-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cl-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveId(null)
          }}
        >
          <div className="cl-modal">
            <button
              type="button"
              className="cl-modal__close"
              aria-label="Закрыть историю"
              onClick={() => setActiveId(null)}
            >
              ✕
            </button>
            <div className="cl-modal__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeMoment.image} alt={activeMoment.alt} />
            </div>
            <div className="cl-modal__body">
              <p className="cl-modal__eyebrow">{activeMoment.storyEyebrow}</p>
              <h3 id="cl-modal-title">
                {activeMoment.storyTitle} <em>{activeMoment.storyEm}</em>
              </h3>
              <p className="cl-modal__lead">{activeMoment.storyLead}</p>
              <p className="cl-modal__fact">{activeMoment.storyFact}</p>
              <div className="cl-modal__actions">
                <a
                  className="v4-pik-btn v4-pik-btn--accent"
                  href="#doma"
                  onClick={() => setActiveId(null)}
                >
                  <span>{activeMoment.storyCta}</span>
                </a>
                <button type="button" className="cl-modal__stay" onClick={() => setActiveId(null)}>
                  Продолжить просмотр
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
