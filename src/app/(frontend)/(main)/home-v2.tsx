import type { Company, Design, Estate, House, Project, Region } from '@/payload-types'
import { BuildTeaser } from '@/components/home/BuildTeaser'
import { EstateCovers, type CoverView } from '@/components/home/EstateCovers'
import { Founder, type Fact } from '@/components/home/Founder'
import { HouseFilm } from '@/components/home/HouseFilm'
import { Included } from '@/components/home/Included'
import { LifeScenes } from '@/components/home/LifeScenes'
import { PlotPicker, type PlotEstate } from '@/components/home/PlotPicker'
import { ScrollX } from '@/components/home/ScrollX'
import { HeroOpen } from '@/components/heroes/HeroOpen'
import { img, plural } from '@/lib/data'
import { mainHref } from '@/lib/site'
import { byEstateStatus, estateView, genplanEstate, houseView } from '@/lib/view'

/**
 * Home v2 (29.10, after the call of 27.10): nine screens, one thought and one action each — the house opens to the whole
 * screen → who builds → the estates on the client's covers → a free plot on the plan → the houses as a film strip →
 * life out of town in the client's words → what the price includes and how to buy → build your own (last: the company
 * sells houses first) → «Это место нужно увидеть самому» (the lead form of Shell).
 */
export function HomeV2({
  company,
  design,
  estates,
  houses,
  projects,
}: {
  company: Company
  design: Design
  estates: Estate[]
  houses: House[]
  projects: Project[]
  regions: Region[]
}) {
  const free = houses.filter((h) => h.status === 'free').map(houseView)
  const years = company.since ? new Date().getFullYear() - company.since : null
  const homesCount = company.homesBuilt || estates.reduce((s, e) => s + (e.homes || 0), 0)

  // screen 1: the points on the photo come from the admin (project «Тип 5»), not typed into the design
  const tip5 = projects.find((p) => p.name === 'Тип 5')
  const points = [
    { x: 330, y: 425, title: 'Проект «Тип 5»', text: tip5?.area ? `${tip5.area.toLocaleString('ru-RU')} м²${tip5.bedrooms ? ` · ${tip5.bedrooms} ${plural(tip5.bedrooms, 'спальня', 'спальни', 'спален')}` : ''}` : 'кирпичный дом с участком' },
    { x: 1400, y: 560, title: 'Кирпич и кровля', text: 'только с документами' },
  ]

  // screen 2: the founder and three numbers
  const f = company.founder
  // homes: only the admin's «Домов построено» — the sum of estates' plots (108 after the price list of 27.10) counts
  // unbuilt plots of the developer's plan, so without the client's number the fact is the estates
  const estatesCount = estates.filter((e) => e.status !== 'planned').length
  const facts: Fact[] = [
    ...(years ? [{ value: `${years} ${plural(years, 'год', 'года', 'лет')}`, label: `строим дома, с ${company.since}` }] : []),
    company.homesBuilt
      ? { value: String(homesCount), label: plural(homesCount, 'дом построен', 'дома построено', 'домов построено') }
      : { value: String(estatesCount), label: `${plural(estatesCount, 'посёлок', 'посёлка', 'посёлков')} под Краснодаром` },
    { value: '20+', label: 'планировок под разный уклад' },
    { value: '5 лет', label: 'гарантия на дом' },
  ]

  // screen 3: every estate on its cover, the first «рядом» line as the distance
  const covers: CoverView[] = byEstateStatus(
    estates.map((e) => ({ ...estateView(e, houses), near: e.nearby?.[0] ? `${e.nearby[0].label} — ${e.nearby[0].value}` : null })),
  )

  // screen 4: estates with free houses, each with all its houses so the plan shows sold and reserved plots too
  const plots: PlotEstate[] = estates
    .map((e) => {
      const mine = houses.filter((h) => (typeof h.estate === 'object' ? h.estate?.id : h.estate) === e.id).map(houseView)
      return { e, mine, free: mine.filter((h) => h.status === 'free').length }
    })
    .filter((x) => x.free > 0 && x.e.status !== 'planned')
    .sort((a, b) => b.free - a.free)
    .map(({ e, mine }) => ({ name: e.name, href: estateView(e, houses).href, estate: genplanEstate(e, mine.length), houses: mine }))

  // screen 5: free houses with a real picture, one card per picture (several houses share the project's photo);
  // «Тип 12» has only the client's render with a pool — not passed off as a built house (decision of 23.10)
  const seen = new Set<string>()
  const film = [...free]
    .sort((a, b) => a.price - b.price)
    .filter((h) => h.photo && !h.title.startsWith('Тип 12') && !seen.has(h.photo) && seen.add(h.photo))
    .slice(0, 14)

  // screen 8: a two-storey project's plan as the architect's drawing (as on the old «Построить» card)
  const build = projects.find((p) => p.storeys === 2 && p.plan) ?? projects.find((p) => p.plan)
  const buildPlan = build?.slug === 'tip-9' ? '/design/plan-tip9-lines.webp' : img(build?.plan, 'wide')

  const founder = (
    <Founder
      f={{ photo: img(f?.photo, 'wide'), name: f?.name, role: f?.role, quote: f?.quote }}
      facts={facts}
      compact={design.homeOrder === 'together'}
    />
  )
  const estatesHead = (
    <div className="v2-head" data-reveal>
      <div>
        <p className="eyebrow">Посёлки</p>
        <h2 className="title title--lg">
          Где вы будете <em>жить</em>
        </h2>
      </div>
      <a className="v2-link" href={mainHref('/locations')}>
        Все посёлки на карте →
      </a>
    </div>
  )

  const order = design.homeOrder ?? 'founder'
  const founderSection = (
    <section className="section v2-sec" id="who">
      <div className="container">{founder}</div>
    </section>
  )
  const estatesSection = (
    <section className="section v2-sec v2-sec--tint" id="estates">
      <ScrollX track=".v2-covers__track">
        <div className="container">{estatesHead}</div>
        <EstateCovers estates={covers} />
      </ScrollX>
    </section>
  )

  return (
    <>
      <HeroOpen
        since={company.since}
        lead="Капитальные кирпичные дома с участком в 15–40 минутах от Краснодара — готовые и под ключ."
        points={points}
        catalogHref={mainHref('/catalog')}
      />
      <div id="next" />

      {order === 'together' ? (
        <section className="section v2-sec" id="who">
          <div className="container v2-duo">
            {founder}
            <div className="v2-duo__estates">
              {estatesHead}
              <EstateCovers estates={covers} grid />
            </div>
          </div>
        </section>
      ) : order === 'estates' ? (
        <>
          {estatesSection}
          {founderSection}
        </>
      ) : (
        <>
          {founderSection}
          {estatesSection}
        </>
      )}

      {plots.length > 0 && (
        <section className="section v2-sec" id="plots">
          <div className="container">
            <div className="v2-head" data-reveal>
              <div>
                <p className="eyebrow">Свободные участки</p>
                <h2 className="title title--lg">
                  Выберите <em>свой участок</em> на плане посёлка
                </h2>
              </div>
              <p className="v2-head__note">Зелёные — свободны. Наведите на дом, чтобы увидеть цену, нажмите — откроется дом.</p>
            </div>
            <PlotPicker estates={plots} />
          </div>
        </section>
      )}

      {film.length > 0 && (
        <section className="section v2-sec v2-sec--tint" id="houses">
          <div className="container">
            <div className="v2-head" data-reveal>
              <div>
                <p className="eyebrow">Дома в продаже</p>
                <h2 className="title title--lg">
                  Готовые дома <em>под ваш бюджет</em>
                </h2>
              </div>
              <p className="v2-head__note">
                {free.length} {plural(free.length, 'дом', 'дома', 'домов')} с участком в продаже. Цены — из прайса застройщика.
              </p>
            </div>
            <HouseFilm houses={film} catalogHref={mainHref('/catalog')} />
          </div>
        </section>
      )}

      <section className="section v2-sec" id="life">
        <ScrollX track=".v2-life__row">
          <div className="container">
            <LifeScenes />
          </div>
        </ScrollX>
      </section>

      <section className="section v2-sec v2-sec--tint" id="included">
        <div className="container">
          <Included
            finishing={company.finishing ?? []}
            programs={(company.mortgage ?? []).map((m) => ({ title: m.title, text: m.text }))}
            mortgageHref={mainHref('/mortgage')}
          />
        </div>
      </section>

      <section className="section v2-sec" id="build">
        <div className="container">
          <BuildTeaser
            plan={buildPlan}
            planNote={build ? `Проект «${build.name}»${build.area ? ` · ${build.area.toLocaleString('ru-RU')} м²` : ''}` : 'Архитектурный проект'}
            projects={projects.length}
            buildHref={mainHref('/build')}
          />
        </div>
      </section>
    </>
  )
}
