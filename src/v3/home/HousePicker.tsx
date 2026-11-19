'use client'

/**
 * Каталог и подбор домов в стиле референса ПИК:
 * единая горизонтальная панель из капсул-пилюль (круглые номера типов 1..12, капсула цены от/до,
 * посёлки, кнопка «На карте» с мини-иконкой и акцентная капсула-счётчик справа) +
 * совмещённый просмотр готовых домов в продаже и всех 12 типовых проектов с планировками.
 */
import { useMemo, useRef, useState } from 'react'

export type PickHouse = {
  code: string
  title: string
  area: number
  plot: string | null
  price: number
  estate: string
  photo?: string
  href: string
  caption: string
}

export type PickProjectType = {
  slug: string
  num: number
  name: string
  area: number | null
  bedrooms: number | null
  storeys: string
  photo?: string
  plan?: string
  free: number
  fromPrice: number | null
  href: string
}

const BUDGETS = [
  { id: 'all', label: 'Любая цена', min: 0, max: Infinity, fromText: '7,5 млн ₽', toText: '14,5 млн ₽' },
  { id: 'lt9', label: 'до 9 млн ₽', min: 0, max: 9e6, fromText: '7,5 млн ₽', toText: '9,0 млн ₽' },
  { id: '9-12', label: '9 – 12 млн ₽', min: 9e6, max: 12e6, fromText: '9,0 млн ₽', toText: '12,0 млн ₽' },
  { id: 'gt12', label: 'от 12 млн ₽', min: 12e6, max: Infinity, fromText: '12,0 млн ₽', toText: '14,5 млн ₽' },
]

const mln = (p: number) => `${(p / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн ₽`
const word = (n: number) =>
  n % 10 === 1 && n % 100 !== 11 ? 'дом' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'дома' : 'домов'

const typeNumOf = (title: string): number | null => {
  const m = title.match(/Тип\s+(\d+)/i)
  return m ? Number(m[1]) : null
}

export function HousePicker({
  houses,
  projectTypes = [],
  catalogHref,
  grid = false,
  typeFilter = false,
}: {
  houses: PickHouse[]
  projectTypes?: PickProjectType[]
  catalogHref: string
  grid?: boolean
  typeFilter?: boolean
}) {
  const estates = useMemo(() => [...new Set(houses.map((h) => h.estate))], [houses])
  const availableTypeNums = useMemo(() => {
    const nums = new Set<number>()
    houses.forEach((h) => {
      const n = typeNumOf(h.title)
      if (n) nums.add(n)
    })
    projectTypes.forEach((p) => {
      if (p.num <= 12) nums.add(p.num)
    })
    return [...nums].sort((a, b) => a - b)
  }, [houses, projectTypes])

  const [mode, setMode] = useState<'houses' | 'types'>('houses')
  const [estate, setEstate] = useState<string>('all')
  const [budget, setBudget] = useState('all')
  const [typeNum, setTypeNum] = useState<number | 'all'>('all')
  const strip = useRef<HTMLDivElement>(null)

  const b = BUDGETS.find((x) => x.id === budget)!
  const list = houses.filter(
    (h) =>
      (estate === 'all' || h.estate === estate) &&
      (typeNum === 'all' || typeNumOf(h.title) === typeNum) &&
      h.price >= b.min &&
      h.price < b.max,
  )

  const activeProject = useMemo(
    () => (typeNum !== 'all' ? projectTypes.find((p) => p.num === typeNum) : undefined),
    [projectTypes, typeNum],
  )

  const minPrice = list.length ? Math.min(...list.map((h) => h.price)) : 7_900_000
  const maxPrice = list.length ? Math.max(...list.map((h) => h.price)) : 12_900_000

  const scroll = (dir: number) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <div className="v3-pick v4-catalog-pick">
      {/* Панель фильтров в стиле ПИК (кружки типов, двойная капсула цены, посёлки, «На карте» и акцентный счётчик) */}
      <div className="v4-pik-bar" role="group" aria-label="Фильтры подбора дома">
        {projectTypes.length > 0 && (
          <div className="v4-pik-seg" role="tablist" aria-label="Режим каталога">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'houses'}
              className={`v4-pik-btn${mode === 'houses' ? ' is-dark' : ''}`}
              onClick={() => setMode('houses')}
            >
              <span>Готовые дома ({houses.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'types'}
              className={`v4-pik-btn${mode === 'types' ? ' is-dark' : ''}`}
              onClick={() => setMode('types')}
            >
              <span>12 типов и планировки</span>
            </button>
          </div>
        )}

        {typeFilter && availableTypeNums.length > 1 && mode === 'houses' && (
          <div className="v4-pik-rooms" role="group" aria-label="Номер типа проекта">
            <button
              type="button"
              className={`v4-pik-circle v4-pik-circle--wide${typeNum === 'all' ? ' is-on' : ''}`}
              aria-pressed={typeNum === 'all'}
              onClick={() => setTypeNum('all')}
            >
              Все типы
            </button>
            {availableTypeNums.map((num) => (
              <button
                key={num}
                type="button"
                className={`v4-pik-circle${typeNum === num ? ' is-on' : ''}`}
                aria-pressed={typeNum === num}
                aria-label={`Тип ${num}`}
                onClick={() => setTypeNum(typeNum === num ? 'all' : num)}
              >
                {num}
              </button>
            ))}
          </div>
        )}

        {mode === 'houses' && (
          <>
            {/* Двойная капсула цены в стиле ПИК: от ... | до ... */}
            <div className="v4-pik-pricepill" role="group" aria-label="Диапазон цены">
              <span className="v4-pik-pricepill__half">
                <small>от</small> <b>{ minPrice.toLocaleString('ru-RU') } ₽</b>
              </span>
              <i className="v4-pik-pricepill__div" aria-hidden />
              <span className="v4-pik-pricepill__half">
                <small>до</small> <b>{ maxPrice.toLocaleString('ru-RU') } ₽</b>
              </span>
            </div>

            {/* Быстрые капсулы бюджета */}
            {BUDGETS.slice(1).map((x) => (
              <button
                key={x.id}
                type="button"
                className={`v4-pik-btn${budget === x.id ? ' is-dark' : ''}`}
                aria-pressed={budget === x.id}
                onClick={() => setBudget(budget === x.id ? 'all' : x.id)}
              >
                <span>{x.label}</span>
              </button>
            ))}

            {/* Капсулы посёлков */}
            {estates.length > 1 && (
              <>
                <button
                  type="button"
                  className={`v4-pik-btn${estate === 'all' ? ' is-dark' : ''}`}
                  aria-pressed={estate === 'all'}
                  onClick={() => setEstate('all')}
                >
                  <span>Все посёлки</span>
                </button>
                {estates.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`v4-pik-btn${estate === e ? ' is-dark' : ''}`}
                    aria-pressed={estate === e}
                    onClick={() => setEstate(estate === e ? 'all' : e)}
                  >
                    <span>{e}</span>
                  </button>
                ))}
              </>
            )}
          </>
        )}

        <a href="/v4#karta" className="v4-pik-btn v4-pik-btn--map">
          <span>На карте</span>
          <i className="v4-pik-mapdot" aria-hidden />
        </a>

        <span className="v4-pik-btn v4-pik-btn--accent" aria-live="polite">
          <span>
            {mode === 'types'
              ? `${projectTypes.length} типовых проектов`
              : `${list.length} ${word(list.length)}`}
          </span>
        </span>
      </div>

      {/* Если выбран конкретный номер типа — показываем компактную карточку этого типа с планировкой */}
      {mode === 'houses' && activeProject && (
        <div className="v4-type-banner">
          {activeProject.plan && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeProject.plan} alt={`Планировка ${activeProject.name}`} className="v4-type-banner__plan" />
          )}
          <div className="v4-type-banner__info">
            <b>Проект «{activeProject.name}»</b>
            <span>
              {activeProject.area ? `${activeProject.area} м² · ` : ''}
              {activeProject.bedrooms ? `${activeProject.bedrooms} спальни · ` : ''}
              {activeProject.storeys}
            </span>
          </div>
          <a href={activeProject.href} className="v4-pik-btn">
            <span>Подробная планировка «{activeProject.name}» →</span>
          </a>
        </div>
      )}

      {/* Режим «12 типов и планировки» прямо внутри страницы «Дома в продаже» */}
      {mode === 'types' && projectTypes.length > 0 ? (
        <div className="v3-strip v3-strip--grid">
          {projectTypes.map((p) => (
            <a key={p.slug} className="v3-card v4-type-card" href={p.href}>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.photo ? <img src={p.photo} alt={p.name} loading="lazy" /> : <span className="v3-card__noimg">Фото скоро</span>}
                <figcaption>Проект · {p.storeys}</figcaption>
              </figure>
              <div className="v3-card__body">
                {p.free > 0 ? (
                  <span className="v3-status"><i />{p.free} {word(p.free)} в продаже</span>
                ) : (
                  <span className="v3-status v3-status--off"><i />Под заказ</span>
                )}
                <h3>{p.name}{p.area ? ` · ${p.area.toLocaleString('ru-RU')} м²` : ''}</h3>
                <p>{p.bedrooms ? `${p.bedrooms} спальни · ` : ''}{p.storeys}</p>
                <p className="v3-price">{p.fromPrice ? `от ${mln(p.fromPrice)}` : 'По запросу'}</p>
              </div>
            </a>
          ))}
        </div>
      ) : list.length > 0 ? (
        <div className="v3-strip-wrap">
          <div className={`v3-strip${grid ? ' v3-strip--grid' : ''}`} ref={strip}>
            {list.map((h) => (
              <a key={h.code} className="v3-card" href={h.href}>
                <figure>
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
          {!grid && (
            <div className="v3-strip__nav">
              <button type="button" onClick={() => scroll(-1)} aria-label="Назад">←</button>
              <button type="button" onClick={() => scroll(1)} aria-label="Дальше">→</button>
            </div>
          )}
        </div>
      ) : (
        <p className="v3-empty">Под этот выбор свободных домов сейчас нет. Сбросьте фильтр или оставьте телефон ниже — подберём из новых.</p>
      )}
    </div>
  )
}
