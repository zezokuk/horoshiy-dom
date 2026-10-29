'use client'

import { useMemo, useRef, useState } from 'react'
import { formatMillions, plural } from '@/lib/format'
import type { HouseView } from '@/lib/view'

const BUDGETS = [
  { key: 'all', label: 'Все', test: () => true },
  { key: 'b9', label: 'до 9 млн', test: (p: number) => p <= 9_000_000 },
  { key: 'b12', label: '9–12 млн', test: (p: number) => p > 9_000_000 && p <= 12_000_000 },
  { key: 'b12p', label: 'от 12 млн', test: (p: number) => p > 12_000_000 },
] as const

/**
 * Home v2, screen 5 «Дома» (Igor, 27.10: cards that roll like a film strip, swiped to the right): the free houses with
 * real prices around a centre card, the budget chips of KASKAD on top. Drag, swipe, arrows or the keyboard.
 */
export function HouseFilm({ houses, catalogHref }: { houses: HouseView[]; catalogHref: string }) {
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]['key']>('all')
  const list = useMemo(() => houses.filter((h) => BUDGETS.find((b) => b.key === budget)!.test(h.price)), [houses, budget])
  const [at, setAt] = useState(0)
  const cur = Math.min(at, Math.max(list.length - 1, 0))
  const go = (d: number) => setAt((n) => Math.max(0, Math.min(list.length - 1, Math.min(n, list.length - 1) + d)))
  const drag = useRef<{ x: number; moved: boolean } | null>(null)

  return (
    <div className="v2-film">
      <div className="v2-film__top">
        <div className="v2-chips" role="group" aria-label="Бюджет">
          {BUDGETS.map((b) => {
            const n = houses.filter((h) => b.test(h.price)).length
            return (
              <button key={b.key} type="button" aria-pressed={budget === b.key} disabled={!n} onClick={() => (setBudget(b.key), setAt(0))}>
                {b.label}
                <i>{n}</i>
              </button>
            )
          })}
        </div>
        <div className="v2-arrows">
          <button type="button" onClick={() => go(-1)} disabled={cur === 0} aria-label="Предыдущий дом">
            ←
          </button>
          <span className="v2-film__count" aria-live="polite">
            {String(cur + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}
          </span>
          <button type="button" onClick={() => go(1)} disabled={cur >= list.length - 1} aria-label="Следующий дом">
            →
          </button>
        </div>
      </div>

      <div
        className="v2-film__stage"
        tabIndex={0}
        aria-roledescription="карусель"
        aria-label="Свободные дома"
        onKeyDown={(e) => (e.key === 'ArrowRight' ? go(1) : e.key === 'ArrowLeft' ? go(-1) : null)}
        onPointerDown={(e) => (drag.current = { x: e.clientX, moved: false })}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d || d.moved || Math.abs(e.clientX - d.x) < 48) return
          d.moved = true
          go(e.clientX < d.x ? 1 : -1)
        }}
        onPointerUp={() => setTimeout(() => (drag.current = null))}
        onPointerCancel={() => (drag.current = null)}
      >
        <i className="v2-film__holes" aria-hidden />
        {list.map((h, n) => {
          const o = n - cur
          if (Math.abs(o) > 3) return null
          return (
            <a
              key={h.code}
              href={h.href}
              className={`v2-frame ${o === 0 ? 'is-current' : ''}`}
              style={{ ['--o' as string]: o, ['--a' as string]: Math.abs(o) }}
              aria-hidden={o !== 0}
              tabIndex={o === 0 ? 0 : -1}
              draggable={false}
              onClick={(e) => {
                if (drag.current?.moved) return e.preventDefault()
                if (o !== 0) {
                  e.preventDefault()
                  setAt(n)
                }
              }}
            >
              <span className="v2-frame__photo">
                {h.photo && <img src={h.photoCard ?? h.photo} srcSet={h.photoCard ? `${h.photoCard} 640w, ${h.photo} 1600w` : undefined} sizes="(min-width: 960px) 560px, 80vw" alt={h.title} loading="lazy" decoding="async" draggable={false} />}
                <span className="v2-frame__estate">{h.estateName}</span>
              </span>
              <span className="v2-frame__body">
                <span className="v2-frame__title">{h.title}</span>
                <span className="v2-frame__specs">
                  {h.area.toLocaleString('ru-RU')} м²{h.mansard ? ` + ${h.mansard} м² мансарда` : ''}
                  {h.plot ? ` · участок ${h.plot}` : ''}
                  {h.bedrooms ? ` · ${h.bedrooms} ${plural(h.bedrooms, 'спальня', 'спальни', 'спален')}` : ''}
                </span>
                <span className="v2-frame__price">{formatMillions(h.price)}</span>
              </span>
            </a>
          )
        })}
        <i className="v2-film__holes v2-film__holes--bottom" aria-hidden />
      </div>

      <div className="v2-film__foot">
        <a className="btn btn--green" href={list[cur]?.href ?? catalogHref}>
          Смотреть этот дом
        </a>
        <a className="v2-link" href={catalogHref}>
          Все дома с фильтрами →
        </a>
      </div>
    </div>
  )
}
