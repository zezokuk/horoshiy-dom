'use client'

import { useState } from 'react'
import { formatMillions, softHyphens } from '@/lib/format'
import { mainHref } from '@/lib/site'
import { estateSale, type EstateView } from '@/lib/view'
import { PlacesMap } from './PlacesMap'
import { Words } from './Words'

export type PlaceEstate = EstateView & { photo?: string; photoCard?: string }

export function PlacesExplorer({ estates }: { estates: PlaceEstate[] }) {
  const [activeSlug, setActiveSlug] = useState(estates[0]?.slug ?? '')
  const active = estates.find((e) => e.slug === activeSlug) ?? estates[0]
  if (!active) return null

  return (
    <section className="section section--green places-explorer" id="places" aria-label="Локации">
      <div className="container">
        <div className="places-explorer__head" data-reveal>
          <div>
            <span className="idx">Локации</span>
            <Words text="Выберите, где хотите *жить*" />
          </div>
          <a className="places-explorer__all" href={mainHref('/locations')}>
            Все локации <span aria-hidden>↗</span>
          </a>
        </div>

        <div className="places-explorer__layout">
          <div className="places-explorer__map" data-reveal>
            <PlacesMap estates={estates} activeSlug={active.slug} onActivate={setActiveSlug} />
            <p className="places-explorer__map-note">Схема по координатам посёлков, не дорожная карта</p>
          </div>

          <div className="places-explorer__side">
            <article className="places-explorer__current" key={active.slug}>
              <div className="places-explorer__photo">
                {active.photoCard ? (
                  <img
                    src={active.photoCard}
                    srcSet={active.photo ? `${active.photoCard} 640w, ${active.photo} 1600w` : undefined}
                    sizes="(min-width: 960px) 180px, 112px"
                    alt={`Посёлок «${active.name}»`}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="places-explorer__empty">
                    <span>Скоро</span>
                    <b>{active.name}</b>
                  </div>
                )}
              </div>
              <div className="places-explorer__info">
                <span className="places-explorer__place">{active.place}</span>
                <h3>{active.name}</h3>
                <p>
                  {estateSale(active)}
                  {active.priceFrom ? ` · от ${formatMillions(active.priceFrom)}` : ''}
                </p>
                <a href={active.href}>
                  Смотреть посёлок <span aria-hidden>↗</span>
                </a>
              </div>
            </article>

            <ul className="places-explorer__list" aria-label="Выбрать посёлок">
              {estates.map((e) => (
                <li key={e.slug}>
                  <button
                    type="button"
                    className={e.slug === active.slug ? 'is-on' : undefined}
                    aria-pressed={e.slug === active.slug}
                    onClick={() => setActiveSlug(e.slug)}
                    onMouseEnter={() => setActiveSlug(e.slug)}
                    onFocus={() => setActiveSlug(e.slug)}
                  >
                    <span className="places-explorer__name">{softHyphens(e.name)}</span>
                    <span className="places-explorer__sale">{estateSale(e).toLowerCase()}</span>
                    <i aria-hidden>→</i>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
