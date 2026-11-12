'use client'

/**
 * v4 · «Дома по типам» (Илья 12.11: «где-то сделать дом по типам»; у «Дубльдома» это «модельный ряд»).
 * Слева список типов строками: площадь, этажи, цена от, сколько в продаже. Справа — большое фото типа, на который
 * навели или дошли с клавиатуры; фото сменяется шторкой. Каждая строка — ссылка на страницу типа (сайт многостраничный).
 * На телефоне наведения нет: у каждой строки своя миниатюра, большое фото скрыто.
 */
import { useState } from 'react'

export type TypeView = {
  slug: string; name: string; area: number | null; storeys: number | null; bedrooms: number | null
  photo?: string; thumb?: string; free: number; from: number | null; href: string
}

const mln = (p: number) => `${(p / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн ₽`
const word = (n: number, a: string, b: string, c: string) => (n % 10 === 1 && n % 100 !== 11 ? a : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? b : c)

export function TypeList({ types, allHref }: { types: TypeView[]; allHref: string }) {
  const [on, setOn] = useState(0)
  const cur = types[on]
  if (!cur) return null
  return (
    <div className="v4-types">
      <ol className="v4-types__list">
        {types.map((t, k) => (
          <li key={t.slug}>
            <a href={t.href} className={k === on ? 'is-on' : ''} onMouseEnter={() => setOn(k)} onFocus={() => setOn(k)}>
              <span className="v4-types__n">{String(k + 1).padStart(2, '0')}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.thumb && <img className="v4-types__thumb" src={t.thumb} alt="" loading="lazy" />}
              <span className="v4-types__name">
                <b>{t.name}</b>
                <i>{[t.area ? `${t.area.toLocaleString('ru-RU')} м²` : null, t.storeys ? `${t.storeys} ${word(t.storeys, 'этаж', 'этажа', 'этажей')}` : null, t.bedrooms ? `${t.bedrooms} ${word(t.bedrooms, 'спальня', 'спальни', 'спален')}` : null].filter(Boolean).join(' · ')}</i>
              </span>
              <span className="v4-types__price">
                {t.free > 0 && t.from ? <><b>от {mln(t.from)}</b><i>{t.free} {word(t.free, 'дом', 'дома', 'домов')} в продаже</i></> : <i>сейчас нет в продаже</i>}
              </span>
              <span className="v4-types__go" aria-hidden>→</span>
            </a>
          </li>
        ))}
      </ol>
      <div className="v4-types__view">
        <div className="v4-types__photo">
          {types.map((t, k) => (
            // eslint-disable-next-line @next/next/no-img-element
            t.photo ? <img key={t.slug} className={k === on ? 'is-on' : ''} src={t.photo} alt="" loading={k === 0 ? 'eager' : 'lazy'} /> : null
          ))}
          <p key={cur.slug} aria-hidden><b>{cur.name}</b>{cur.area ? ` · ${cur.area.toLocaleString('ru-RU')} м²` : ''} · изображение проекта</p>
        </div>
        <a className="v4-types__all" href={allHref}>Все типы и планировки →</a>
      </div>
    </div>
  )
}
