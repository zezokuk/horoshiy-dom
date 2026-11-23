'use client'

import { useState } from 'react'
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
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" style={direction === 'left' ? { transform: 'rotate(180deg)' } : undefined}><path d="M3 12h17m-6-6 6 6-6 6" /></svg>
}

export function FeaturedHouses({ houses, count }: { houses: FeaturedHouse[]; count: number }) {
  const [index, setIndex] = useState(0)
  const house = houses[index] ?? houses[0]
  const href = house && '/v4/dom/' + encodeURIComponent(house.code)
  const switchHouse = (step: number) => setIndex(i => (i + step + houses.length) % houses.length)

  return <section id="doma" className="fh" aria-labelledby="fh-title">
    <div className="fh-wrap">
      <div className="fh-head">
        <h2 id="fh-title">Дома <em>в продаже</em></h2>
        <a className="fh-all" href="/v4/doma">{count ? 'Все ' + count + ' ' + plural(count, 'дом', 'дома', 'домов') : 'В каталог'} <Arrow /></a>
      </div>
      {house && href ? <div className="fh-spread">
        <a className="fh-photo" href={href} aria-label={'Открыть ' + house.title + ', ' + house.location}>
          {house.image && <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={house.image} src={house.image} alt={house.alt} width="1350" height="900" />
            <span className="fh-source">{house.caption}</span>
          </>}
        </a>
        <div className="fh-sheet">
          <div className="fh-facts" key={house.code} aria-live="polite">
            <p className="fh-place">{house.location}</p>
            <h3><a href={href}>{house.title}</a></h3>
            <p className="fh-price">{formatMillions(house.price)}</p>
            <dl>
              <div><dt>Площадь дома</dt><dd>{formatArea(house.area)} м²</dd></div>
              {house.plot && <div><dt>Участок</dt><dd>{house.plot}</dd></div>}
              {house.bedrooms && <div><dt>Спальни</dt><dd>{house.bedrooms}</dd></div>}
              {house.mansard && <div><dt>Мансарда</dt><dd>+{formatArea(house.mansard)} м²</dd></div>}
              {house.monthlyPay && <div><dt>Ипотека {house.familyRate ?? 6}%</dt><dd>от {house.monthlyPay.toLocaleString('ru-RU')} ₽/мес</dd></div>}
            </dl>
            <a className="fh-open" href={href}>Открыть дом <Arrow /></a>
          </div>
          {houses.length > 1 && <div className="fh-switch">
            <span><b>{String(index + 1).padStart(2, '0')}</b> / {String(houses.length).padStart(2, '0')}</span>
            <div><button type="button" onClick={() => switchHouse(-1)} aria-label="Предыдущий дом"><Arrow direction="left" /></button>
            <button type="button" onClick={() => switchHouse(1)} aria-label="Следующий дом"><Arrow /></button></div>
          </div>}
        </div>
      </div> : <p>Уточните наличие домов в отделе продаж. <a href="#evf-form">Связаться</a></p>}
    </div>
  </section>
}
