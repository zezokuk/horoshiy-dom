import { Pic } from '@/components/Pic'
import { mainHref } from '@/lib/site'
import type { HeroFacts } from './facts'
import { FactCards, HeroLead } from './FactCards'
import { H, HeroPoints, W, type HeroPoint } from './HeroDepth'

const POINTS: HeroPoint[] = [
  { x: 330, y: 425, lx: 60, ly: 345, title: 'Проект «Тип 5»', text: '105 м², 3 спальни' },
  { x: 1400, y: 560, lx: 1515, ly: 465, title: 'Кирпич и кровля', text: 'только с документами' },
]

/**
 * Variant 5 «Vintara» (reference 1, as Ilya asked 20.10): one tone for everything. The brand name huge, the real
 * «Тип 5» big in front of it — the roof covers the letters — and the house tinted into the brand colour, so it reads as
 * an object on a calm board, not as a snapshot with a fence and a sky. Soft light from below, a thin arc and two glass
 * cards. The mouse moves the layers a little against each other (PageMotion → --px/--py).
 * The tint is a colour layer cut to the house's own shape (mask = the cut-out photo), so it follows «Внешний вид».
 */
export function HeroTonal({ f, hasRealHomes = false }: { f: HeroFacts; hasRealHomes?: boolean }) {
  return (
    <section className="hd hx hv">
      <div className="hd__wrap">
        <div className="hd__stage">
          {f.since && <p className="hd__eyebrow">Строительная компания · с {f.since} года</p>}
          <h1 className="hd__title">
            <span>Хороший</span> <span style={{ ['--d' as string]: '140ms' }}>дом</span>
          </h1>
          <div className="hx__house hv__house">
            <svg className="hd__arc" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
              <circle cx={836} cy={1010} r={760} vectorEffect="non-scaling-stroke" />
            </svg>
            <Pic src="/design/hero1-house.webp" phone="/design/hero1-house-900.webp" alt="Кирпичный дом «Хорошего дома», проект «Тип 5»" priority />
            <i className="hv__tone" aria-hidden />
            <HeroPoints points={POINTS} />
          </div>
        </div>
        <FactCards f={f} />
      </div>
      <HeroLead f={f} />
      <div className="hd__actions">
        <a className="btn btn--gold" href={hasRealHomes ? '#real-homes' : mainHref('/catalog')}>
          {f.free > 0 ? 'Смотреть свободные дома' : 'Перейти в каталог'} <span aria-hidden>↓</span>
        </a>
        <a className="btn btn--ghost" href={mainHref('/build')}>
          Построить дом
        </a>
      </div>
    </section>
  )
}
