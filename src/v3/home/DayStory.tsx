'use client'

/**
 * v3 · глава «Один день в своём доме» (сторителлинг, просьба Александра 02.11 и Ильи 12.11): фото закреплено, текст
 * листается рядом — утро, день, вечер. Активный шаг меняет кадр наплывом и подсвечивает время. Без перехвата прокрутки:
 * position: sticky + IntersectionObserver. Тексты — дословно или близко к «Мыслям о загородной жизни» клиента.
 */
import { useEffect, useRef, useState } from 'react'

export type DayStep = { time: string; word: string; text: string; src: string; cap: string }

export function DayStory({ steps, coda }: { steps: DayStep[]; coda: string }) {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)) }),
      { rootMargin: '-45% 0px -45% 0px' },
    )
    refs.current.forEach((n) => n && io.observe(n))
    return () => io.disconnect()
  }, [])

  return (
    <div className="v3-day">
      <div className="v3-day__media" aria-hidden>
        {steps.map((s, i) => (
          <figure key={s.src} className={i === active ? 'is-on' : ''}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
            <figcaption>{s.cap}</figcaption>
          </figure>
        ))}
        <ol className="v3-day__clock">
          {steps.map((s, i) => <li key={s.time} className={i === active ? 'is-on' : ''}>{s.time}</li>)}
        </ol>
      </div>
      <div className="v3-day__steps">
        {steps.map((s, i) => (
          <section key={s.word} className={`v3-day__step${i === active ? ' is-on' : ''}`} data-i={i} ref={(n) => { refs.current[i] = n }}>
            <p className="v3-day__time">{s.time}</p>
            <h3>{s.word}</h3>
            <p>{s.text}</p>
          </section>
        ))}
        <p className="v3-day__coda">{coda}</p>
      </div>
    </div>
  )
}
