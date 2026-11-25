'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatArea, formatMillions, plural } from '@/lib/format'
import './featuredHouses.css'

export type FeaturedHouse = {
  code: string
  location: string
  title: string
  storeyTag?: '1' | 'mansard' | '2'
  price: number
  area: number
  plot: string | null
  mansard: number | null
  bedrooms?: number | null
  projectName?: string
  monthlyPay?: number | null
  mortgageDown?: number
  mortgageYears?: number
  familyRate?: number
  image?: string
  altImage?: string
  altCaption?: string
  planImage?: string
  caption: string
  alt: string
}

type StoreyFilter = 'all' | '1' | 'mansard' | '2'
type CardView = 'facade' | 'alt' | 'plan'

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
  const [storeyFilter, setStoreyFilter] = useState<StoreyFilter>('all')
  const [cardViews, setCardViews] = useState<Record<string, CardView>>({})

  const filterPills = useMemo(() => {
    const items: { id: StoreyFilter; label: string }[] = [{ id: 'all', label: 'Все дома' }]
    if (houses.some((h) => h.storeyTag === '1')) items.push({ id: '1', label: '1 этаж' })
    if (houses.some((h) => h.storeyTag === 'mansard')) items.push({ id: 'mansard', label: 'С мансардой' })
    if (houses.some((h) => h.storeyTag === '2')) items.push({ id: '2', label: '2 этажа' })
    return items
  }, [houses])

  const visibleHouses = useMemo(
    () => (storeyFilter === 'all' ? houses : houses.filter((h) => h.storeyTag === storeyFilter)),
    [houses, storeyFilter],
  )

  const syncActive = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const cards = Array.from(el.querySelectorAll<HTMLElement>('.fh-slide'))
    if (!cards.length) return
    const left = el.getBoundingClientRect().left
    const nextIdx = cards.reduce((nearest, card, i) => (
      Math.abs(card.getBoundingClientRect().left - left) < Math.abs(cards[nearest].getBoundingClientRect().left - left) ? i : nearest
    ), 0)
    setIndex(nextIdx)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', syncActive, { passive: true })
    return () => el.removeEventListener('scroll', syncActive)
  }, [syncActive])

  const selectFilter = (next: StoreyFilter) => {
    setStoreyFilter(next)
    setIndex(0)
    if (trackRef.current) trackRef.current.scrollLeft = 0
  }

  const scrollToSlide = (targetIdx: number) => {
    const el = trackRef.current
    if (!el || !visibleHouses.length) return
    const nextIdx = (targetIdx + visibleHouses.length) % visibleHouses.length
    const cards = el.querySelectorAll<HTMLElement>('.fh-slide')
    const target = cards[nextIdx]
    if (target) {
      const left = el.scrollLeft + target.getBoundingClientRect().left - el.getBoundingClientRect().left
      el.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
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
            <p className="fh-sub">Цена каждого дома включает участок. Подборка от самого доступного.</p>
          </div>
          <div className="fh-head-right">
            {visibleHouses.length > 1 && (
              <div className="fh-switch" aria-label="Навигация по слайдеру домов">
                <span>
                  <b>{String(index + 1).padStart(2, '0')}</b> / {String(visibleHouses.length).padStart(2, '0')}
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
            <a className="fh-all" href="/v4/doma?view=houses">
              {count ? 'Все ' + count + ' ' + plural(count, 'дом', 'дома', 'домов') : 'В каталог'} <Arrow />
            </a>
          </div>
        </div>

        {filterPills.length > 2 && (
          <div className="fh-filters" role="group" aria-label="Фильтр по этажности">
            {filterPills.map((pill) => (
              <button
                key={pill.id}
                type="button"
                className={storeyFilter === pill.id ? 'is-on' : undefined}
                aria-pressed={storeyFilter === pill.id}
                onClick={() => selectFilter(pill.id)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        )}

        {visibleHouses.length > 0 ? (
          <div
            ref={trackRef}
            className="fh-rail"
            role="region"
            aria-label="Свободные дома в продаже"
            onDragStart={e => e.preventDefault()}
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
            {visibleHouses.map((house, i) => {
              const href = '/v4/dom/' + encodeURIComponent(house.code)
              const view = cardViews[house.code] ?? 'facade'
              const isPlan = view === 'plan' && Boolean(house.planImage)
              const activeImg = isPlan
                ? house.planImage
                : view === 'alt' && house.altImage
                  ? house.altImage
                  : house.image
              const activeCaption = isPlan
                ? 'Планировка · ' + (house.projectName ?? house.title)
                : view === 'alt' && house.altCaption
                  ? house.altCaption
                  : house.caption
              const hasTabs = Boolean(house.altImage || house.planImage)

              return (
                <article key={house.code} className="fh-spread fh-slide">
                  <a
                    className={isPlan ? 'fh-photo fh-photo--plan' : 'fh-photo'}
                    href={href}
                    aria-label={'Открыть ' + house.title + ', ' + house.location}
                  >
                    {activeImg && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeImg}
                          alt={isPlan ? 'Планировка: ' + (house.projectName ?? house.title) : house.alt}
                          width="1350"
                          height="900"
                          loading={i < 2 ? 'eager' : 'lazy'}
                        />
                        {house.projectName && <span className="fh-badge">{house.projectName}</span>}
                        <span className="fh-source">{activeCaption}</span>
                      </>
                    )}
                  </a>
                  <div className="fh-sheet">
                    <div className="fh-facts">
                      {hasTabs && (
                        <div className="fh-views" role="group" aria-label={'Вид карточки · ' + (house.projectName ?? house.title)}>
                          <button
                            type="button"
                            className={view === 'facade' ? 'is-on' : undefined}
                            aria-pressed={view === 'facade'}
                            onClick={() => setCardViews((prev) => ({ ...prev, [house.code]: 'facade' }))}
                          >
                            Фасад
                          </button>
                          {house.altImage && (
                            <button
                              type="button"
                              className={view === 'alt' ? 'is-on' : undefined}
                              aria-pressed={view === 'alt'}
                              onClick={() => setCardViews((prev) => ({ ...prev, [house.code]: 'alt' }))}
                            >
                              Вид
                            </button>
                          )}
                          {house.planImage && (
                            <button
                              type="button"
                              className={view === 'plan' ? 'is-on' : undefined}
                              aria-pressed={view === 'plan'}
                              onClick={() => setCardViews((prev) => ({ ...prev, [house.code]: 'plan' }))}
                            >
                              План
                            </button>
                          )}
                        </div>
                      )}
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
                            <dt>Семейная ипотека · {house.familyRate}%</dt>
                            <dd><a href={href + '#ipoteka'} aria-label={'Рассчитать ипотеку, ' + house.location}>≈ {house.monthlyPay.toLocaleString('ru-RU')} ₽/мес</a></dd>
                          </div>
                        )}
                      </dl>
                      {house.monthlyPay && <p className="fh-terms">При взносе {house.mortgageDown}% на {house.mortgageYears} {plural(house.mortgageYears ?? 0, 'год', 'года', 'лет')}</p>}
                    </div>
                    <div className="fh-card-foot">
                      <a className="fh-open" href={href}>
                        Открыть дом <Arrow />
                      </a>
                    </div>
                  </div>
                </article>
              )
            })}

            <a className="fh-more-card" href="/v4/doma?view=houses">
              <span className="fh-more-eyebrow">Каталог и планировки</span>
              <h3>
                Все свободные дома <em>в каталоге</em>
              </h3>
              <p>
                {count
                  ? `${count} ${plural(count, 'готовый дом', 'готовых дома', 'готовых домов')} в продаже. Подберите по посёлку и бюджету.`
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
