'use client'

import { useEffect, useRef, useState } from 'react'
import { formatArea, formatMillions, formatPrice, plural } from '@/lib/format'
import { mainHref } from '@/lib/site'
import type { HouseView } from '@/lib/view'
import { Words } from './Words'

export function RealHomes({ houses }: { houses: HouseView[] }) {
  const root = useRef<HTMLElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [motionAllowed, setMotionAllowed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [manual, setManual] = useState(false)
  const house = houses[active] ?? houses[0]

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setMotionAllowed(!media.matches && !document.documentElement.classList.contains('no-motion'))
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden)
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  const canPlay =
    houses.length > 1 && playing && inView && pageVisible && motionAllowed && !hovered && !focused

  useEffect(() => {
    if (!canPlay) return
    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % houses.length)
      setManual(false)
    }, 7000)
    return () => window.clearTimeout(timer)
  }, [active, canPlay, houses.length])

  if (!house) return null

  const go = (index: number) => {
    setActive((index + houses.length) % houses.length)
    setManual(true)
  }

  return (
    <section
      ref={root}
      className="section section--green real-homes"
      id="real-homes"
      aria-label="Готовые дома"
      aria-roledescription="carousel"
      data-playing={canPlay ? 'yes' : 'no'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
    >
      <div className="container">
        <div className="real-homes__head">
          <div>
            <span className="idx">Готовые дома</span>
            <Words text="Дома, которые можно *увидеть вживую*" />
          </div>
          <div className="real-homes__actions">
            {houses.length > 1 && (
              <div className="real-homes__controls" role="group" aria-label="Управление показом">
                <button type="button" aria-label="Предыдущий дом" title="Предыдущий дом" onClick={() => go(active - 1)}>
                  <span aria-hidden>←</span>
                </button>
                {motionAllowed && (
                  <button
                    type="button"
                    className="real-homes__toggle"
                    aria-label={playing ? 'Поставить показ на паузу' : 'Включить автоматический показ'}
                    aria-pressed={!playing}
                    title={playing ? 'Пауза' : 'Включить автопоказ'}
                    onClick={() => setPlaying((value) => !value)}
                  >
                    <span aria-hidden>{playing ? 'Ⅱ' : '▶'}</span>
                  </button>
                )}
                <button type="button" aria-label="Следующий дом" title="Следующий дом" onClick={() => go(active + 1)}>
                  <span aria-hidden>→</span>
                </button>
              </div>
            )}
            <a className="real-homes__all" href={mainHref('/catalog')}>
              Весь каталог <span aria-hidden>↗</span>
            </a>
          </div>
        </div>

        <div className="real-homes__stage">
          <div
            className="real-homes__media"
            onTouchStart={(e) => {
              const touch = e.touches[0]
              touchStart.current = { x: touch.clientX, y: touch.clientY }
            }}
            onTouchEnd={(e) => {
              const start = touchStart.current
              const touch = e.changedTouches[0]
              touchStart.current = null
              if (!start || !touch) return
              const dx = touch.clientX - start.x
              const dy = touch.clientY - start.y
              if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) go(active + (dx < 0 ? 1 : -1))
            }}
            onTouchCancel={() => {
              touchStart.current = null
            }}
          >
            {houses.map((item, index) => (
              <img
                key={item.code}
                className={index === active ? 'is-on' : undefined}
                src={item.photo}
                srcSet={item.photoCard ? `${item.photoCard} 640w, ${item.photo} 1600w` : undefined}
                sizes="(min-width: 960px) 66vw, 100vw"
                alt={index === active ? `${item.title}, посёлок ${item.estateName}` : ''}
                aria-hidden={index !== active}
                loading="lazy"
                decoding="async"
              />
            ))}
            <span className="real-homes__counter" aria-hidden>
              {String(active + 1).padStart(2, '0')} / {String(houses.length).padStart(2, '0')}
            </span>
          </div>

          <div className="real-homes__panel" key={house.code} aria-live={manual ? 'polite' : 'off'} aria-atomic="true">
            <p className="real-homes__place">
              <span className="real-homes__status" aria-hidden />
              {house.estateName} · Свободен
            </p>
            <h3>{house.title}</h3>
            <p className="real-homes__price">{formatPrice(house.price)}</p>
            <dl className="real-homes__facts">
              <div>
                <dt>Площадь дома</dt>
                <dd>{formatArea(house.area)} м²</dd>
              </div>
              {house.plot && (
                <div>
                  <dt>Участок</dt>
                  <dd>{house.plot}</dd>
                </div>
              )}
              {!!house.bedrooms && (
                <div>
                  <dt>Внутри</dt>
                  <dd>
                    {house.bedrooms} {plural(house.bedrooms, 'спальня', 'спальни', 'спален')}
                  </dd>
                </div>
              )}
            </dl>
            <a className="btn btn--green" href={house.href} data-house-photo>
              Смотреть дом и планировку <span aria-hidden>↗</span>
            </a>
            <p className="real-homes__note">Комплектация и расчёт ипотеки — на странице дома.</p>
          </div>
        </div>

        <div className="real-homes__selector" role="group" aria-label="Выбрать дом для просмотра">
          {houses.map((item, index) => (
            <button
              key={item.code}
              type="button"
              className={index === active ? 'is-on' : undefined}
              aria-pressed={index === active}
              aria-label={`${item.title}, ${formatArea(item.area)} м², ${item.estateName}, ${formatPrice(item.price)}`}
              onClick={() => go(index)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault()
                  go(active + (e.key === 'ArrowRight' ? 1 : -1))
                }
              }}
            >
              <span className="real-homes__thumb" aria-hidden>
                <img src={item.photoCard ?? item.photo} alt="" loading="lazy" decoding="async" />
                <span className="real-homes__number">{String(index + 1).padStart(2, '0')}</span>
              </span>
              <span className="real-homes__choice">
                <b>{item.title}</b>
                <span>
                  {formatArea(item.area)} м² · {item.estateName}
                </span>
              </span>
              <span className="real-homes__from">{formatMillions(item.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
