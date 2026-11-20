'use client'

/**
 * v4 · «Ипотека» в конце главной: выбираете дом из каталога и первый взнос — видите кредит и платёж в месяц
 * по семейной ипотеке. Ставка, срок, минимальный взнос и лимит — из админки («Компания → Семейная ипотека»),
 * формула — та же annuity, что на странице дома. Это прикидка: точные условия даёт банк, так и написано.
 */
import { useMemo, useRef, useState } from 'react'
import { goal } from '@/components/Metrika'
import { annuity } from '@/lib/format'

export type MortgageHouse = { code: string; label: string; price: number }
type Family = { rate: number; years: number; minDown: number; limit: number }

const rub = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} ₽`
const mln = (v: number) => `${(v / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн ₽`

export function Mortgage({ houses, family }: { houses: MortgageHouse[]; family: Family }) {
  const [code, setCode] = useState(houses[0]?.code ?? '')
  const sentCalc = useRef(false)
  const trackCalc = () => {
    if (!sentCalc.current) {
      sentCalc.current = true
      goal('v4_mortgage_calc')
    }
  }
  const house = houses.find((h) => h.code === code) ?? houses[0]
  const price = house?.price ?? 0
  // с лимитом кредита дорогому дому нужен взнос больше минимального
  const need = price ? Math.max(family.minDown, Math.ceil(((price - family.limit) / price) * 100)) : family.minDown
  const [share, setShare] = useState(need)
  const down = Math.max(need, Math.min(90, share))
  const credit = price * (1 - down / 100)
  const pay = useMemo(() => annuity(credit, family.rate, family.years), [credit, family.rate, family.years])
  if (!house) return null

  return (
    <div className="v4-mort">
      <div className="v4-mort__in">
        <label htmlFor="v4-mort-house">Дом из каталога</label>
        <select id="v4-mort-house" value={code} onChange={(e) => { setCode(e.target.value); setShare(0); trackCalc() }}>
          {houses.map((h) => <option key={h.code} value={h.code}>{h.label} — {mln(h.price)}</option>)}
        </select>
        <label htmlFor="v4-mort-down">Первый взнос: <b>{down} %</b> · {rub(price * down / 100)}</label>
        <input id="v4-mort-down" type="range" min={need} max={90} step={1} value={down} onChange={(e) => { setShare(Number(e.target.value)); trackCalc() }} />
        <p className="v3-note">
          {need > family.minDown
            ? `Минимальный взнос по программе — ${family.minDown} %, но кредит не больше ${mln(family.limit)}, поэтому для этого дома взнос от ${need} %.`
            : `Минимальный взнос по программе — ${family.minDown} %.`}
        </p>
      </div>
      <div className="v4-mort__out" aria-live="polite">
        <p className="v4-mort__label">Платёж в месяц, примерно</p>
        <p className="v4-mort__pay">{rub(pay)}</p>
        <dl>
          <div><dt>Кредит</dt><dd>{rub(credit)}</dd></div>
          <div><dt>Ставка</dt><dd>{family.rate.toLocaleString('ru-RU')} %</dd></div>
          <div><dt>Срок</dt><dd>{family.years} лет</dd></div>
        </dl>
        <p className="v3-note">Расчёт по семейной ипотеке, прикидка. Ставку и одобрение подбирает банк — менеджер поможет с программой и документами.</p>
      </div>
    </div>
  )
}
