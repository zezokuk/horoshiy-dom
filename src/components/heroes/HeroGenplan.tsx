import { Genplan } from '@/components/Genplan'
import { formatMillions, plural } from '@/lib/format'
import type { GenplanEstate } from '@/lib/genplan'
import type { HouseView } from '@/lib/view'
import type { HeroFacts } from './facts'

/**
 * Variant 2 (reference «HAVN»): the first screen is the estate's 3D plan itself — houses lit by status, filter tiles,
 * a ribbon of free houses over the scene. The estate with the most free houses; the others are one tap away.
 * Cost: three.js loads with the first screen (on the estate page it waits until the plan scrolls into view).
 */
export function HeroGenplan({
  f,
  estate,
  houses,
  current,
}: {
  f: HeroFacts
  estate: GenplanEstate
  houses: HouseView[]
  current: string
}) {
  return (
    <section className="hg">
      <div className="container hg__in">
        <div className="hg__head">
          <div>
            {f.since && <p className="hm__eyebrow">Строительная компания · с {f.since} года</p>}
            <h1 className="hg__title">Хороший дом</h1>
          </div>
          <p className="hg__lead">
            {f.free > 0
              ? `${f.free} ${plural(f.free, 'дом свободен', 'дома свободны', 'домов свободно')}${f.priceFrom ? ` от ${formatMillions(f.priceFrom)}` : ''} — выберите свой прямо на генплане посёлка. Свободные подсвечены и подписаны ценой.`
              : 'Посмотрите наши посёлки на генплане: каждый дом подписан статусом.'}
          </p>
        </div>
        {f.selling.length > 1 && (
          <nav className="hg__estates" aria-label="Посёлки в продаже">
            {f.selling.map((e) => (
              <a key={e.href} href={e.href} aria-current={e.name === current ? 'true' : undefined}>
                {e.name} <i>{e.free}</i>
              </a>
            ))}
          </nav>
        )}
        <Genplan estate={estate} houses={houses} stage />
      </div>
    </section>
  )
}
