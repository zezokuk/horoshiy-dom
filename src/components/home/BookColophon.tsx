import type { Estate } from '@/payload-types'

/**
 * Home v2, the last page before the lead form (03.11, «сайт — это книга», Igor; «каждый покупатель — соавтор», Ilya):
 * the imprint of the book «Хороший дом». The estates are the books of the series — from the admin, with their status:
 * sold out reads «тираж распродан», a planned one «готовится к выходу». Plain facts, no fairy tale.
 */
export function BookColophon({ since, estates }: { since?: number | null; estates: Pick<Estate, 'name' | 'status'>[] }) {
  const series = estates.filter((e) => e.name)
  return (
    <section className="section v2-sec v2-colophon" aria-label="Выходные данные">
      <div className="container">
        <div className="v2-colophon__page" data-reveal>
          <p className="v2-colophon__label">Выходные данные</p>
          <p className="v2-colophon__title">
            Хороший дом. <span>Книга о домах, которые начинаются с мечты.</span>
          </p>
          <p>{since ? `Издаётся с ${since} года · ` : ''}Краснодар и пригород</p>
          {series.length > 0 && (
            <p>
              В серии:{' '}
              {series.map((e, i) => (
                <span key={e.name}>
                  {i > 0 && ' · '}«{e.name}»
                  {e.status === 'soldOut' && <em> — тираж распродан</em>}
                  {e.status === 'planned' && <em> — готовится к выходу</em>}
                </span>
              ))}
            </p>
          )}
          <p className="v2-colophon__coauthors">Соавторы — каждая семья, которая построила здесь свой дом.</p>
        </div>
      </div>
    </section>
  )
}
