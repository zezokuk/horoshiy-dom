'use client'

import { useRef } from 'react'
import { formatMillions } from '@/lib/format'
import { estateSale, type EstateView } from '@/lib/view'

export type CoverView = EstateView & { near?: string | null }

/**
 * Home v2, screen 3 «Посёлки»: the client's own covers (dandelions, kalina, the bird at the feeder…), the thing he liked
 * most on the call — big, one after another, swiped sideways. On sale first, sold-out ones as proof, «Скоро» last.
 */
export function EstateCovers({ estates, grid = false }: { estates: CoverView[]; grid?: boolean }) {
  const track = useRef<HTMLDivElement>(null)
  const step = (dir: 1 | -1) => {
    const el = track.current
    const card = el?.querySelector<HTMLElement>('.v2-cover')
    if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: 'smooth' })
  }
  return (
    <div className={`v2-covers ${grid ? 'v2-covers--grid' : ''}`}>
      <div className="v2-covers__track" ref={track}>
        {estates.map((e) => (
          <a key={e.slug} href={e.href} className={`v2-cover v2-cover--${e.status}`}>
            {/* the cover is the client's own poster (logo, name, «сюда приводят мечты»): shown whole, our facts go under it */}
            <span className="v2-cover__poster">
              {e.cover ? (
                <img src={e.cover} srcSet={e.coverCard ? `${e.coverCard} 640w, ${e.cover} 1600w` : undefined} sizes="(min-width: 960px) 420px, 82vw" alt={`Посёлок «${e.name}»`} loading="lazy" decoding="async" />
              ) : (
                <span className="v2-cover__blank">
                  <span>{e.name}</span>
                </span>
              )}
              {e.status === 'planned' && <span className="v2-cover__tag">Скоро</span>}
              {e.status === 'soldOut' && <span className="v2-cover__tag v2-cover__tag--sold">Все дома проданы</span>}
            </span>
            <span className="v2-cover__body">
              <span className="v2-cover__place">{e.place}</span>
              <span className="v2-cover__name">{e.name}</span>
              {/* two parts: v2 reads them as one line «17 домов в продаже · от 8,3 млн ₽», the look «dom» puts the price big */}
              <span className="v2-cover__meta">
                <span className="v2-cover__sale">{estateSale(e)}</span>
                {e.priceFrom ? <span className="v2-cover__from">от {formatMillions(e.priceFrom)}</span> : null}
              </span>
              {e.near && <span className="v2-cover__near">{e.near}</span>}
              {/* says what the picture is for: without it the cover read as a book, not as an estate one can open (call of 30.10) */}
              <span className="v2-cover__go">
                {e.status === 'planned' ? 'Узнать о старте продаж' : e.status === 'soldOut' ? 'Посмотреть посёлок' : 'Смотреть дома'} <i aria-hidden>→</i>
              </span>
            </span>
          </a>
        ))}
      </div>
      {!grid && estates.length > 3 && (
        <div className="container v2-covers__nav">
          <div className="v2-arrows" aria-label="Листать посёлки">
            <button type="button" onClick={() => step(-1)} aria-label="Назад">
              ←
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Дальше">
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
