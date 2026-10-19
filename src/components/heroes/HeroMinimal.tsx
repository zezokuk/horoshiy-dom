import { Pic } from '@/components/Pic'
import { formatMillions, plural } from '@/lib/format'
import { mainHref } from '@/lib/site'
import type { HeroFacts } from './facts'

type Photo = { src: string; phone?: string; alt: string; caption?: string | null }

/**
 * Variant 3 (reference «Loom»): paper, a huge two-line title with the second line shifted and in gold, one tilted
 * photo card with a white border, big numbers and a thin gold thread that loops around the photo and runs on down the
 * page (components/Thread). Few elements, a lot of air. Phones: the same order in one column.
 */
export function HeroMinimal({
  f,
  photo,
  slogan,
}: {
  f: HeroFacts
  photo?: Photo
  slogan?: string | null
}) {
  const numbers = [
    f.years ? { b: `${f.years}`, s: `${plural(f.years, 'год', 'года', 'лет')} строим дома` } : null,
    { b: `${f.homes}`, s: f.homesLabel },
    f.free
      ? {
          b: `${f.free}`,
          s: `${plural(f.free, 'дом свободен', 'дома свободны', 'домов свободно')}${f.priceFrom ? ` от ${formatMillions(f.priceFrom)}` : ''}`,
        }
      : null,
  ].filter((n): n is { b: string; s: string } => !!n)
  return (
    <section className="hm">
      <div className="container hm__in">
        {f.since && <p className="hm__eyebrow">Строительная компания · с {f.since} года</p>}
        <h1 className="hm__title">
          <span>Хороший дом</span>
          {slogan && <em style={{ ['--d' as string]: '140ms' }}>{slogan.toLowerCase()}</em>}
        </h1>
        <p className="hm__lead">
          Капитальные кирпичные дома с участком{f.regionsLine ? ` — ${f.regionsLine}` : ''}. Готовые
          — с отделкой и коммуникациями, или построим по одному из {f.projects} проектов за 6
          месяцев.
        </p>
        <div className="hm__btns">
          <a className="btn btn--gold" href="#choose">
            Выбрать дом
          </a>
          <a className="hm__link" href={mainHref('/build')}>
            Построить по проекту →
          </a>
        </div>

        {photo && (
          <figure className="hm__photo">
            <div className="hm__card">
              <Pic src={photo.src} phone={photo.phone} alt={photo.alt} priority />
            </div>
            {photo.caption && <figcaption>{photo.caption}</figcaption>}
          </figure>
        )}

        <dl className="hm__numbers">
          {numbers.map((n) => (
            <div key={n.s}>
              <dt>{n.b}</dt>
              <dd>{n.s}</dd>
            </div>
          ))}
        </dl>

        {/* the thread's first loop: around the photo; components/Thread carries it on through the page */}
        <svg className="hm__thread" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden>
          <path
            d="M-40 92 C 220 52, 520 36, 760 96 S 1080 420, 900 560 S 620 520, 700 380 S 1060 230, 1260 300"
            pathLength={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </section>
  )
}
