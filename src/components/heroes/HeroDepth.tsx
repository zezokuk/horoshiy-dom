import { Pic } from '@/components/Pic'
import type { HeroFacts } from './facts'
import { FactCards, HeroLead } from './FactCards'

// layers made by tools/heroassets.py from the client's photo of «Тип 5» (media/photo-14427948.webp, 1673×897 after crop)
export const W = 1673
export const H = 897
export const at = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })

export type HeroPoint = { x: number; y: number; lx: number; ly: number; title: string; text: string }

// points on the photo: what is there, and where its label sits (photo pixels). Facts only: the house is the project
// «Тип 5» (105 м², projects in the admin); brick and roofing «только с документами» (company advantages)
const POINTS: HeroPoint[] = [
  { x: 330, y: 425, lx: 60, ly: 345, title: 'Кирпич и кровля', text: 'только с документами' },
  { x: 1440, y: 600, lx: 1515, ly: 505, title: 'Проект «Тип 5»', text: '105 м², 3 спальни' },
]

/** Thin lines from labels to dots on the house (photo pixels → % of the house box). */
export function HeroPoints({ points }: { points: HeroPoint[] }) {
  return (
    <>
      <svg className="hd__lines" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        {points.map((p) => (
          <polyline key={p.title} points={`${p.lx + 8},${p.ly + 60} ${p.x},${p.y}`} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {points.map((p) => (
        <span key={p.title} className="hd__dot" style={at(p.x, p.y)} aria-hidden />
      ))}
      {points.map((p) => (
        <span key={p.title} className="hd__label" style={at(p.lx, p.ly)}>
          <i>{p.title}</i>
          <b>{p.text}</b>
        </span>
      ))}
    </>
  )
}

/**
 * Variant 1 (reference «Vintara»): the brand name huge, and the client's real house in front of it — the roof covers
 * the lower part of the letters. Two glass cards with live numbers, a round action button, thin lines to points on the
 * house. Phones: the same layers cropped around the roof, the title in two lines, labels hidden (dots stay).
 */
export function HeroDepth({ f }: { f: HeroFacts }) {
  return (
    <section className="hd">
      <div className="hd__wrap">
        <div className="hd__stage">
          <div className="hd__frame" aria-hidden>
            <Pic src="/design/hero1-photo.webp" phone="/design/hero1-photo-900.webp" alt="" priority />
            <i className="hd__tint" />
            {/* the circle runs behind the house: depth, like the title */}
            <svg className="hd__arc" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              <circle cx={836} cy={1010} r={760} vectorEffect="non-scaling-stroke" />
            </svg>
          </div>

          {f.since && <p className="hd__eyebrow">Строительная компания · с {f.since} года</p>}
          <h1 className="hd__title">
            <span>Хороший</span> <span style={{ ['--d' as string]: '140ms' }}>дом</span>
          </h1>

          <div className="hd__frame hd__frame--front">
            <Pic src="/design/hero1-house.webp" phone="/design/hero1-house-900.webp" alt="Кирпичный дом «Хорошего дома», проект «Тип 5»" />
            <HeroPoints points={POINTS} />
          </div>
        </div>
        <FactCards f={f} />
      </div>
      <HeroLead f={f} />
    </section>
  )
}
