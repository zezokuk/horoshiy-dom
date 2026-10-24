'use client'

import { useState } from 'react'
import { formatArea, formatMillions, formatPrice, plural } from '@/lib/format'
import { mainHref } from '@/lib/site'
import type { HouseView } from '@/lib/view'
import { Words } from './Words'

export function RealHomes({ houses }: { houses: HouseView[] }) {
  const [active, setActive] = useState(0)
  const house = houses[active] ?? houses[0]
  if (!house) return null

  return (
    <section className="section section--green real-homes" id="real-homes" aria-label="Готовые дома">
      <div className="container">
        <div className="real-homes__head">
          <div>
            <span className="idx">Готовые дома</span>
            <Words text="Дома, которые можно *увидеть вживую*" />
          </div>
          <a className="real-homes__all" href={mainHref('/catalog')}>
            Весь каталог <span aria-hidden>↗</span>
          </a>
        </div>

        <div className="real-homes__stage">
          <div className="real-homes__media">
            <img
              key={house.code}
              src={house.photo}
              srcSet={house.photoCard ? `${house.photoCard} 640w, ${house.photo} 1600w` : undefined}
              sizes="(min-width: 960px) 66vw, 100vw"
              alt={`${house.title}, посёлок ${house.estateName}`}
              loading="lazy"
              decoding="async"
            />
            <span className="real-homes__counter" aria-hidden>
              {String(active + 1).padStart(2, '0')} / {String(houses.length).padStart(2, '0')}
            </span>
          </div>

          <div className="real-homes__panel" aria-live="polite" aria-atomic="true">
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
              onClick={() => setActive(index)}
            >
              <span className="real-homes__number" aria-hidden>
                {String(index + 1).padStart(2, '0')}
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
