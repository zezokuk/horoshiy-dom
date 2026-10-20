import { HouseLines } from '@/components/HouseLines'
import { Pic } from '@/components/Pic'
import { DraftSplit } from './DraftSplit'
import type { HeroFacts } from './facts'
import { FactCards, HeroLead } from './FactCards'
import { H, HeroPoints, W, type HeroPoint } from './HeroDepth'

// the drawing side tells about the project, the photo side about what it is built of (facts as in variant 1)
const POINTS: HeroPoint[] = [
  { x: 330, y: 425, lx: 60, ly: 345, title: 'Проект «Тип 5»', text: '105 м², 3 спальни' },
  { x: 1400, y: 560, lx: 1515, ly: 465, title: 'Кирпич и кровля', text: 'только с документами' },
]

/**
 * Variant 4 «Чертёж → дом» (reference 1 «Vintara» + reference 5): the brand name huge on a drawing board, and in front
 * of it «Тип 5» — half a line drawing traced from the photo, half the real house. The house turns real on load; then the
 * mouse moves the line between drawing and house (components/heroes/DraftSplit). On the photo side the roof covers the
 * letters, on the drawing side they show through the lines. No sky photo: the house stands on the board like an object.
 */
export function HeroDraft({ f }: { f: HeroFacts }) {
  return (
    <section className="hd hx">
      <div className="hd__wrap">
        <div className="hd__stage">
          {f.since && <p className="hd__eyebrow">Строительная компания · с {f.since} года</p>}
          <h1 className="hd__title">
            <span>Хороший</span> <span style={{ ['--d' as string]: '140ms' }}>дом</span>
          </h1>
          <DraftSplit>
            <svg className="hd__arc" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
              <circle cx={836} cy={1010} r={760} vectorEffect="non-scaling-stroke" />
            </svg>
            <HouseLines className="hx__lines" />
            <Pic src="/design/hero1-house.webp" phone="/design/hero1-house-900.webp" alt="Кирпичный дом «Хорошего дома», проект «Тип 5»" priority />
            <HeroPoints points={POINTS} />
          </DraftSplit>
        </div>
        <FactCards f={f} />
      </div>
      <HeroLead f={f} />
    </section>
  )
}
