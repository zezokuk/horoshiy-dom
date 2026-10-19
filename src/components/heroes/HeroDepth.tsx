import { Pic } from '@/components/Pic'
import { formatMillions, plural } from '@/lib/format'
import { mainHref } from '@/lib/site'
import type { HeroFacts } from './facts'

// layers made by tools/heroassets.py from the client's photo of «Тип 5» (media/photo-14427948.webp, 1673×897 after crop)
const W = 1673
const H = 897
const at = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })

// points on the photo: what is there, and where its label sits (photo pixels). Facts only: the house is the project
// «Тип 5» (105 м², projects in the admin); brick and roofing «только с документами» (company advantages)
const POINTS = [
  { x: 330, y: 425, lx: 60, ly: 345, title: 'Кирпич и кровля', text: 'только с документами' },
  { x: 1440, y: 600, lx: 1515, ly: 505, title: 'Проект «Тип 5»', text: '105 м², 3 спальни' },
]

/**
 * Variant 1 (reference «Vintara»): the brand name huge, and the client's real house in front of it — the roof covers
 * the lower part of the letters. Two glass cards with live numbers, a round action button, thin lines to points on the
 * house. Phones: the same layers cropped around the roof, the title in two lines, labels hidden (dots stay).
 */
export function HeroDepth({ f }: { f: HeroFacts }) {
  const estates = f.selling.length
  return (
    <section className="hd">
      <div className="hd__wrap">
        <div className="hd__stage">
          <div className="hd__frame" aria-hidden>
            <Pic
              src="/design/hero1-photo.webp"
              phone="/design/hero1-photo-900.webp"
              alt=""
              priority
            />
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
            <Pic
              src="/design/hero1-house.webp"
              phone="/design/hero1-house-900.webp"
              alt="Кирпичный дом «Хорошего дома», проект «Тип 5»"
            />
            <svg
              className="hd__lines"
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              {POINTS.map((p) => (
                <polyline
                  key={p.title}
                  points={`${p.lx + 8},${p.ly + 60} ${p.x},${p.y}`}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {POINTS.map((p) => (
              <span key={p.title} className="hd__dot" style={at(p.x, p.y)} aria-hidden />
            ))}
            {POINTS.map((p) => (
              <span key={p.title} className="hd__label" style={at(p.lx, p.ly)}>
                <i>{p.title}</i>
                <b>{p.text}</b>
              </span>
            ))}
          </div>
        </div>

        {/* over the photo on computers; under it on phones, where the photo is too small to carry them */}
        <div className="hd__cards">
          <a className="hd__card hd__card--left" href={mainHref('/locations')}>
            <span className="hd__card-k">
              <b>{estates}</b> {plural(estates, 'посёлок', 'посёлка', 'посёлков')} в продаже{' '}
              <em aria-hidden>↗</em>
            </span>
            <span className="hd__card-list">{f.selling.map((e) => e.name).join(' · ')}</span>
          </a>
          <div className="hd__card hd__card--right">
            <span className="hd__card-k">
              <b>{f.homes}</b> {f.homesLabel}
            </span>
            <span className="hd__card-list">
              {[
                f.since ? `с ${f.since} года` : '',
                `${f.projects} ${plural(f.projects, 'проект', 'проекта', 'проектов')} домов`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        </div>

        <a className="hd__go" href="#choose">
          Выбрать
          <br />
          дом
        </a>
      </div>

      <p className="hd__lead">
        Капитальные кирпичные дома с участком{f.regionsLine ? ` — ${f.regionsLine}` : ''}.{' '}
        {f.free > 0 && (
          <>
            {f.free} {plural(f.free, 'дом свободен', 'дома свободны', 'домов свободно')}
            {f.priceFrom ? ` от ${formatMillions(f.priceFrom)}` : ''} — или построим по одному из{' '}
            {f.projects} проектов.
          </>
        )}
      </p>
    </section>
  )
}
