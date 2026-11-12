'use client'

/**
 * v4 · «Внутри» — прогулка по дому «Тип 5» по часам одного дня (идея Villa Aurelia «Inside», Илья 13.11).
 * Сцена закреплена на весь экран; прокрутка ведёт по остановкам: кухня-гостиная → терраса → газон → мангал → спальни.
 * Сверху — вкладки остановок с полосками прогресса, внизу слева — стеклянная карточка (час, комната, площадь, строка),
 * внизу справа — мини-план «вы здесь» (вид сверху «Типа 5», точка по координатам комнаты из админки).
 * Пока нет интерьеров, комната показывается «кукольным домиком»: наезд на неё по виду сверху (`zoom`). Когда придут
 * картинки из Gemini — у остановки появляется `src`, и наезд сам заменяется фотографией.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'

export type InsideStop = {
  time: string
  word?: string
  title: string
  area?: string
  text: string
  /** готовая картинка (фото или иллюстрация); без неё — наезд по плану на точку `room` */
  src?: string
  cap: string
  /** точка комнаты на виде сверху, проценты от левого верхнего угла */
  room?: { x: number; y: number }
}

export function Inside({ stops, plan }: { stops: InsideStop[]; plan?: string }) {
  const root = useRef<HTMLElement>(null)
  const [i, setI] = useState(0)
  const [local, setLocal] = useState(0) // прогресс внутри текущей остановки, 0…1 — полоска вкладки
  const n = stops.length

  useEffect(() => {
    const el = root.current
    if (!el) return
    let raf = 0
    const set = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const run = Math.max(1, r.height - innerHeight)
      const p = Math.min(0.9999, Math.max(0, -r.top / run))
      const k = Math.floor(p * n)
      setI(k)
      setLocal(p * n - k)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(set) }
    set()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [n])

  // вкладка ведёт к середине своей остановки
  const go = (k: number) => {
    const el = root.current
    if (!el) return
    const top = el.getBoundingClientRect().top + scrollY
    const run = el.offsetHeight - innerHeight
    scrollTo({ top: top + run * ((k + 0.35) / n), behavior: 'smooth' })
  }

  const cur = stops[i]
  return (
    <section className="v4-in" ref={root} style={{ height: `${n * 90 + 40}svh` }} aria-label="Один день внутри дома «Тип 5»">
      <div className="v4-in__stage">
        {stops.map((s, k) => (
          <figure key={s.title} className={`v4-in__shot${k === i ? ' is-on' : ''}${k < i ? ' is-past' : ''}`} aria-hidden={k !== i}>
            {s.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.src} alt={k === i ? `${s.title}: ${s.cap.toLowerCase()}` : ''} loading={k < 2 ? 'eager' : 'lazy'} />
            ) : plan && s.room ? (
              <div className="v4-in__doll" style={{ '--x': s.room.x, '--y': s.room.y } as CSSProperties}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={plan} alt={k === i ? `${s.title} на виде сверху, мебель для примера` : ''} loading="lazy" />
              </div>
            ) : null}
          </figure>
        ))}
        <i className="v4-in__shade" aria-hidden />

        <div className="v4-in__tabs" role="tablist" aria-label="Остановки">
          {stops.map((s, k) => (
            <button key={s.title} type="button" role="tab" aria-selected={k === i} onClick={() => go(k)}>
              <span>{s.time}</span>
              <i><b style={{ transform: `scaleX(${k < i ? 1 : k === i ? Math.max(0.04, local) : 0})` }} /></i>
            </button>
          ))}
        </div>

        <div className="v4-in__card" key={cur.title} aria-live="polite">
          <p className="v4-in__time">{cur.time}{cur.word ? <> · <em>{cur.word}</em></> : null}</p>
          <h3>{cur.title}</h3>
          {cur.area && <p className="v4-in__area">{cur.area}</p>}
          <p className="v4-in__text">{cur.text}</p>
        </div>

        {plan && (
          <div className={`v4-in__mini${cur.room ? '' : ' is-out'}`} aria-hidden>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={plan} alt="" loading="lazy" />
              {cur.room && <i style={{ left: `${cur.room.x}%`, top: `${cur.room.y}%` }} />}
            </div>
            <span>{cur.room ? 'вы здесь' : 'на участке'}</span>
          </div>
        )}
        <p className="v4-in__cap" key={`c${i}`}>{cur.cap}</p>
      </div>
    </section>
  )
}
