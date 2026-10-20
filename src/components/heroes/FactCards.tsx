import { formatMillions, plural } from '@/lib/format'
import { mainHref } from '@/lib/site'
import type { HeroFacts } from './facts'

/**
 * The «Vintara» furniture shared by variants 1 and 4: two glass cards with live numbers, the round «Выбрать дом»
 * and the line under the screen. Positioned by the .hd__* styles in design.css.
 */
export function FactCards({ f }: { f: HeroFacts }) {
  const estates = f.selling.length
  return (
    <>
      {/* over the photo on computers; under it on phones, where the photo is too small to carry them */}
      <div className="hd__cards">
        <a className="hd__card hd__card--left" href={mainHref('/locations')}>
          <span className="hd__card-k">
            <b>{estates}</b> {plural(estates, 'посёлок', 'посёлка', 'посёлков')} в продаже <em aria-hidden>↗</em>
          </span>
          <span className="hd__card-list">{f.selling.map((e) => e.name).join(' · ')}</span>
        </a>
        <div className="hd__card hd__card--right">
          <span className="hd__card-k">
            <b>{f.homes}</b> {f.homesLabel}
          </span>
          <span className="hd__card-list">
            {[f.since ? `с ${f.since} года` : '', `${f.projects} ${plural(f.projects, 'проект', 'проекта', 'проектов')} домов`]
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
    </>
  )
}

export function HeroLead({ f }: { f: HeroFacts }) {
  return (
    <p className="hd__lead">
      Капитальные кирпичные дома с участком{f.regionsLine ? ` — ${f.regionsLine}` : ''}.{' '}
      {f.free > 0 && (
        <>
          {f.free} {plural(f.free, 'дом свободен', 'дома свободны', 'домов свободно')}
          {f.priceFrom ? ` от ${formatMillions(f.priceFrom)}` : ''} — или построим по одному из {f.projects} проектов.
        </>
      )}
    </p>
  )
}
