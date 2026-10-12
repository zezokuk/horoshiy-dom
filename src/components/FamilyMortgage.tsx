import { annuity, formatPrice } from '@/lib/format'
import type { Company, House } from '@/payload-types'

type Plan = { title: string; note?: string | null; down: number; credit: number }

/**
 * «Расчёт по семейной ипотеке» as on the client's house slide: rate and term on top, then one card per scenario
 * with the down payment, the credit and the monthly payment. Scenarios come from the house in the admin
 * (the bank's numbers for «1 ребёнок» / «2 ребёнка»); without them — one general estimate by the company settings.
 */
export function FamilyMortgage({
  price,
  plans,
  family,
}: {
  price: number
  plans?: House['mortgagePlans']
  family: Company['family']
}) {
  const rate = family?.rate ?? 6
  const years = family?.years ?? 30
  const minDown = family?.minDown ?? 20
  const limit = family?.limit ?? 6_000_000
  const own = (plans ?? []).filter((p) => p.down >= 0 && p.credit > 0)
  const down = Math.max(Math.ceil((price * minDown) / 100), price - limit)
  // the real share for this price: with the credit limit an expensive house needs more than the minimum
  const share = Math.round((down / price) * 100)
  const list: Plan[] = own.length
    ? own
    : [
        {
          title: `Первый взнос ${share} %`,
          note: `минимальный взнос по программе — ${minDown} %, кредит до ${formatPrice(limit)}`,
          down,
          credit: price - down,
        },
      ]

  return (
    <div className="fm">
      <div className="fm__head">
        <span className="fm__label">Расчёт по семейной ипотеке</span>
        <div className="fm__terms">
          <div>
            <b>{rate.toLocaleString('ru-RU')} %</b>
            <span>ставка</span>
          </div>
          <div>
            <b>{years} лет</b>
            <span>срок</span>
          </div>
        </div>
      </div>
      <div className="fm__cards">
        {list.map((p) => (
          <div key={p.title} className="fm__card">
            <b className="fm__title">{p.title}</b>
            {p.note && <span className="note">{p.note}</span>}
            <dl>
              <div>
                <dt>Первый взнос</dt>
                <dd>{formatPrice(p.down)}</dd>
              </div>
              <div>
                <dt>Кредит</dt>
                <dd>{formatPrice(p.credit)}</dd>
              </div>
            </dl>
            <div className="fm__pay">
              <span>Платёж</span>
              <b>≈ {formatPrice(annuity(p.credit, rate, years))}</b>
              <span>/ мес.</span>
            </div>
          </div>
        ))}
      </div>
      <p className="note">
        {own.length ? 'Расчёт для этого дома.' : 'Примерный расчёт.'} Точные условия определяет банк
        — менеджер подберёт программу и поможет с документами.
      </p>
    </div>
  )
}
