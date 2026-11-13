'use client'

/**
 * v3 · экран 1 «Подбор и дома» — сразу под первым экраном («сразу купить», как у sk-mv и ПИК):
 * чипы посёлка и бюджета режут ленту домов прямо здесь, лента тянется вправо (горизонталь «не навязываем» — страница
 * идёт вниз, вправо листает тот, кто хочет). Данные — из админки (цены и статусы из прайса).
 */
import { useMemo, useRef, useState } from 'react'

export type PickHouse = { code: string; title: string; area: number; plot: string | null; price: number; estate: string; photo?: string; href: string; caption: string }

const BUDGETS = [
  { id: 'all', label: 'Любой бюджет', min: 0, max: Infinity },
  { id: 'lt9', label: 'до 9 млн', min: 0, max: 9e6 },
  { id: '9-12', label: '9–12 млн', min: 9e6, max: 12e6 },
  { id: 'gt12', label: 'от 12 млн', min: 12e6, max: Infinity },
]
const mln = (p: number) => `${(p / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн ₽`
const word = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'дом' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'дома' : 'домов')

export function HousePicker({ houses, catalogHref, grid = false }: { houses: PickHouse[]; catalogHref: string; /** v4-каталог: сетка вместо ленты вправо */ grid?: boolean }) {
  const estates = useMemo(() => [...new Set(houses.map((h) => h.estate))], [houses])
  const [estate, setEstate] = useState<string>('all')
  const [budget, setBudget] = useState('all')
  const strip = useRef<HTMLDivElement>(null)
  const b = BUDGETS.find((x) => x.id === budget)!
  const list = houses.filter((h) => (estate === 'all' || h.estate === estate) && h.price >= b.min && h.price < b.max)
  const scroll = (dir: number) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <div className="v3-pick">
      <div className="v3-pick__bar" role="group" aria-label="Подбор дома">
        <div className="v3-chips">
          <button type="button" className="v3-chip" aria-pressed={estate === 'all'} onClick={() => setEstate('all')}>Все посёлки</button>
          {estates.map((e) => <button key={e} type="button" className="v3-chip" aria-pressed={estate === e} onClick={() => setEstate(e)}>{e}</button>)}
        </div>
        <div className="v3-chips">
          {BUDGETS.map((x) => <button key={x.id} type="button" className="v3-chip" aria-pressed={budget === x.id} onClick={() => setBudget(x.id)}>{x.label}</button>)}
        </div>
        <p className="v3-pick__count" aria-live="polite"><b>{list.length}</b> {word(list.length)} в продаже{list.length ? `, от ${mln(Math.min(...list.map((h) => h.price)))}` : ''}</p>
      </div>

      {list.length > 0 ? (
        <div className="v3-strip-wrap">
          <div className={`v3-strip${grid ? ' v3-strip--grid' : ''}`} ref={strip}>
            {list.map((h) => (
              <a key={h.code} className="v3-card" href={h.href} data-move="up">
                <figure data-move="reveal">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {h.photo ? <img src={h.photo} alt={h.title} loading="lazy" /> : <span className="v3-card__noimg">Фото скоро</span>}
                  <figcaption>{h.caption}</figcaption>
                </figure>
                <div className="v3-card__body">
                  <span className="v3-status"><i />Свободен</span>
                  <h3>{h.title} · {h.area.toLocaleString('ru-RU')} м²</h3>
                  <p>{h.estate}{h.plot ? ` · ${h.plot}` : ''}</p>
                  <p className="v3-price">{mln(h.price)}</p>
                </div>
              </a>
            ))}
            {!grid && <a className="v3-card v3-card--all" href={catalogHref}>Все дома<br />в каталоге →</a>}
          </div>
          {!grid && <div className="v3-strip__nav">
            <button type="button" onClick={() => scroll(-1)} aria-label="Назад">←</button>
            <button type="button" onClick={() => scroll(1)} aria-label="Дальше">→</button>
          </div>}
        </div>
      ) : (
        <p className="v3-empty">Под этот выбор свободных домов сейчас нет. Оставьте телефон в конце страницы — подберём из новых.</p>
      )}
    </div>
  )
}
