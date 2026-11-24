'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatArea, formatMillions, plural } from '@/lib/format'
import './featuredHouses.css'

export type FeaturedHouse = {
  code: string
  location: string
  title: string
  price: number
  area: number
  plot: string | null
  mansard: number | null
  bedrooms?: number | null
  projectName?: string
  monthlyPay?: number | null
  familyRate?: number
  image?: string
  caption: string
  alt: string
}

function Arrow({ direction = 'right' }: { direction?: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      style={direction === 'left' ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path d="M3 12h17m-6-6 6 6-6 6" />
    </svg>
  )
}

export function FeaturedHouses({ houses, count }: { houses: FeaturedHouse[]; count: number }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; scrollLeft: number; moved: boolean } | null>(null)
  const [index, setIndex] = useState(0)

  const syncActive = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const cards = Array.from(el.querySelectorAll<HTMLElement>('.fh-slide'))
    if (!cards.length) return
    const scrollCenter = el.scrollLeft + el.clientWidth * 0.36
    let best = 0
    let bestDist = Infinity
    cards.forEach((card, i) => {
      const dist = Math.abs(card.offsetLeft - scrollCenter + card.offsetWidth * 0.3)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setIndex(Math.min(best, Math.max(0, houses.length - 1)))
  }, [houses.length])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', syncActive, { passive: true })
    return () => el.removeEventListener('scroll', syncActive)
  }, [syncActive])

  const scrollToSlide = (targetIdx: number) => {
    const el = trackRef.current
    if (!el || !houses.length) return
    const nextIdx = (targetIdx + houses.length) % houses.length
    const cards = el.querySelectorAll<HTMLElement>('.fh-slide')
    const target = cards[nextIdx]
    if (target) {
      el.scrollTo({ left: target.offsetLeft, behavior: 'smooth' })
      setIndex(nextIdx)
    }
  }

  return (
    <section id="doma" className="fh" aria-labelledby="fh-title">
      <div className="fh-wrap">
        <div className="fh-head">
          <div>
            <h2 id="fh-title">
              Дома <em>в продаже</em>
            </h2>
            <p className="fh-sub">Листайте вправо, чтобы сравнить готовые дома и планировки</p>
          </div>
          <div className="fh-head-right">
            {houses.length > 1 && (
              <div className="fh-switch" aria-label="Навигация по слайдеру домов">
                <span>
                  <b>{String(index + 1).padStart(2, '0')}</b> / {String(houses.length).padStart(2, '0')}
                </span>
                <div>
                  <button type="button" onClick={() => scrollToSlide(index - 1)} aria-label="Предыдущий дом">
                    <Arrow direction="left" />
                  </button>
                  <button type="button" onClick={() => scrollToSlide(index + 1)} aria-label="Следующий дом">
                    <Arrow />
                  </button>
                </div>
              </div>
            )}
            <a className="fh-all" href="/v4/doma">
              {count ? 'Все ' + count + ' ' + plural(count, 'дом', 'дома', 'домов') : 'В каталог'} <Arrow />
            </a>
          </div>
        </div>

        {houses.length > 0 ? (
          <div
            ref={trackRef}
            className="fh-rail"
            role="region"
            aria-label="Свободные дома в продаже"
            onMouseDown={(e) => {
              const el = trackRef.current
              if (!el || e.button !== 0) return
              dragRef.current = { startX: e.pageX, scrollLeft: el.scrollLeft, moved: false }
            }}
            onMouseMove={(e) => {
              const d = dragRef.current
              const el = trackRef.current
              if (!d || !el) return
              const dx = e.pageX - d.startX
              if (Math.abs(dx) > 6) {
                d.moved = true
                el.scrollLeft = d.scrollLeft - dx
              }
            }}
            onMouseUp={() => {
              setTimeout(() => {
                dragRef.current = null
              }, 0)
            }}
            onMouseLeave={() => {
              dragRef.current = null
            }}
            onClickCapture={(e) => {
              if (dragRef.current?.moved) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          >
            {houses.map((house, i) => {
              const href = '/v4/dom/' + encodeURIComponent(house.code)
              return (
                <article key={house.code} className="fh-spread fh-slide">
                  <a className="fh-photo" href={href} aria-label={'Открыть ' + house.title + ', ' + house.location}>
                    {house.image && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={house.image}
                          alt={house.alt}
                          width="1350"
                          height="900"
                          loading={i < 2 ? 'eager' : 'lazy'}
                        />
                        {house.projectName && <span className="fh-badge">{house.projectName}</span>}
                        <span className="fh-source">{house.caption}</span>
                      </>
                    )}
                  </a>
                  <div className="fh-sheet">
                    <div className="fh-facts">
                      <p className="fh-place">{house.location}</p>
                      <h3>
                        <a href={href}>{house.title}</a>
                      </h3>
                      <p className="fh-price">{formatMillions(house.price)}</p>
                      <dl>
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
                        {house.bedrooms && (
                          <div>
                            <dt>Спальни</dt>
                            <dd>{house.bedrooms}</dd>
                          </div>
                        )}
                        {house.mansard && (
                          <div>
                            <dt>Мансарда</dt>
                            <dd>+{formatArea(house.mansard)} м²</dd>
                          </div>
                        )}
                        {house.monthlyPay && (
                          <div>
                            <dt>Ипотека {house.familyRate ?? 6}%</dt>
                            <dd>от {house.monthlyPay.toLocaleString('ru-RU')} ₽/мес</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    <div className="fh-card-foot">
                      <a className="fh-open" href={href}>
                        Открыть дом <Arrow />
                      </a>
                      <span className="fh-card-idx">
                        {String(i + 1).padStart(2, '0')} / {String(houses.length).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}

            <a className="fh-more-card" href="/v4/doma">
              <span className="fh-more-eyebrow">Каталог и планировки</span>
              <h3>
                Все свободные дома <em>в каталоге</em>
              </h3>
              <p>
                {count
                  ? `${count} ${plural(count, 'готовый дом', 'готовых дома', 'готовых домов')} в продаже и 15+ собственных планировок с выбором по посёлку и бюджету.`
                  : 'Все готовые дома и планировки с выбором по посёлку и бюджету.'}
              </p>
              <span className="fh-more-btn">
                Перейти в каталог →
              </span>
            </a>
          </div>
        ) : (
          <p>
            Уточните наличие домов в отделе продаж. <a href="#evf-form">Связаться</a>
          </p>
        )}
      </div>
    </section>
  )
}
