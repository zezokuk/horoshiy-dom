import type { Company, Design, Estate, House, Project, Region } from '@/payload-types'
import { Bridge } from '@/components/home/Bridge'
import { DomMotion } from '@/components/home/DomMotion'
import { V2Motion } from '@/components/home/V2Motion'
import { BuildTeaser } from '@/components/home/BuildTeaser'
import { EstateCovers, type CoverView } from '@/components/home/EstateCovers'
import { EveningFinale } from '@/components/home/EveningFinale'
import { Founder, type Fact } from '@/components/home/Founder'
import { HouseFilm } from '@/components/home/HouseFilm'
import { Included } from '@/components/home/Included'
import { PlotPicker, type PlotEstate } from '@/components/home/PlotPicker'
import { Residents } from '@/components/home/Residents'
import { HeroNight, type HeroSlide } from '@/components/heroes/HeroNight'
import { img, plural } from '@/lib/data'
import { formatMillions } from '@/lib/format'
import { mainHref } from '@/lib/site'
import { byEstateStatus, estateView, genplanEstate, houseView } from '@/lib/view'

/**
 * Home v2 by the frame «ночь → рассвет → день → вечер» and Igor's vision (08.11, задание-Игорю-08-11/видение-Игоря.md):
 * one screen — one buyer's question — one next step, with a short bridge to the next question between the blocks.
 *
 *   night → dawn (HeroNight)                       Куда я попал? Сколько стоит?
 *   the estates on the client's covers             Где вы проснётесь?
 *   the ready houses as a film strip               Какой готовый дом мне подходит?
 *   the 3D plan of an estate                       Где он стоит?
 *   what the price includes and how to buy         Сколько платить?
 *   who builds + room for the residents' stories   Кому доверить деньги?
 *   building (second: own land, own projects)      Нет подходящего готового?
 *   the evening, lights in the windows, the form   Как посмотреть?  (EveningFinale, #lead; Shell skips its form on «/»)
 *
 * Night 09→10.11: chapter I «Дом» (MorningChapter), the road, life out of town (LifeScenes) and the book's colophon
 * (BookColophon) left the home — the components stay; everything before is at git tag v2-do-nochnoy-glavnoy.
 */
export function HomeV2({
  company,
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

  // night → dawn: the live line from the price list, so it never goes stale after a sale
  const priceFrom = free.length ? Math.min(...free.map((h) => h.price).filter((p) => p > 0)) : 0
  const heroFacts = free.length
    ? `${free.length} ${plural(free.length, 'дом', 'дома', 'домов')} в продаже${Number.isFinite(priceFrom) && priceFrom > 0 ? ` · от ${formatMillions(priceFrom)}` : ''}`
    : undefined

  // by day the first screen is a slider of the types on sale: the project's real photo, its area and the lowest price.
  // «Тип 5» is the cinema frame itself; «Тип 12» has only the client's render — not passed off as a built house
  const heroSlides: HeroSlide[] = projects
    .map((p) => {
      const mine = houses.filter((h) => h.status === 'free' && (typeof h.project === 'object' ? h.project?.id : h.project) === p.id)
      const from = Math.min(...mine.map((h) => h.price ?? 0).filter((n) => n > 0))
      const src = img(p.photo, 'wide')
      if (!mine.length || !src || p.name === 'Тип 5' || p.name === 'Тип 12') return null
      const meta = [p.area ? `${p.area.toLocaleString('ru-RU')} м²` : null, Number.isFinite(from) ? `от ${formatMillions(from)}` : null].filter(Boolean).join(' · ')
      return { title: p.name, meta, src, href: mainHref(`/projects/${p.slug}`) }
    })
    .filter((s): s is HeroSlide => s !== null)
    .slice(0, 5)

  // the estates: every one on its cover, on sale first, the first «рядом» line as the distance
  const covers: CoverView[] = byEstateStatus(
    estates.map((e) => ({ ...estateView(e, houses), near: e.nearby?.[0] ? `${e.nearby[0].label} — ${e.nearby[0].value}` : null })),
  )
  const onSale = covers.filter((c) => c.status !== 'planned' && c.status !== 'soldOut').length

  // the ready houses: free ones with a real picture, one card per picture (several houses share the project's photo);
  // «Тип 12» has only the client's render with a pool — not passed off as a built house (decision of 23.10)
  const seen = new Set<string>()
  const film = [...free]
    .sort((a, b) => a.price - b.price)
    .filter((h) => h.photo && !h.title.startsWith('Тип 12') && !seen.has(h.photo) && seen.add(h.photo))
    .slice(0, 14)

  // the 3D plan: estates with free houses, each with all its houses so the plan shows sold and reserved plots too
  const plots: PlotEstate[] = estates
    .map((e) => {
      const mine = houses.filter((h) => (typeof h.estate === 'object' ? h.estate?.id : h.estate) === e.id).map(houseView)
      return { e, mine, free: mine.filter((h) => h.status === 'free').length }
    })
    .filter((x) => x.free > 0 && x.e.status !== 'planned')
    .sort((a, b) => b.free - a.free)
    .map(({ e, mine }) => ({ name: e.name, href: estateView(e, houses).href, estate: genplanEstate(e, mine.length), houses: mine }))

  // who builds: the founder and the numbers. Homes: only the admin's «Домов построено» — the sum of estates' plots counts
  // unbuilt plots of the developer's plan, so without the client's number the fact is the estates
  const f = company.founder
  const estatesCount = estates.filter((e) => e.status !== 'planned').length
  const facts: Fact[] = [
    ...(years ? [{ value: `${years} ${plural(years, 'год', 'года', 'лет')}`, label: `строим дома, с ${company.since}` }] : []),
    company.homesBuilt
      ? { value: String(homesCount), label: plural(homesCount, 'дом построен', 'дома построено', 'домов построено') }
      : { value: String(estatesCount), label: `${plural(estatesCount, 'посёлок', 'посёлка', 'посёлков')} под Краснодаром` },
    { value: '20+', label: 'планировок под разный уклад' },
    { value: '5 лет', label: 'гарантия на дом' },
  ]

  // building: a two-storey project's plan as the architect's drawing
  const build = projects.find((p) => p.storeys === 2 && p.plan) ?? projects.find((p) => p.plan)
  const buildPlan = build?.slug === 'tip-9' ? '/design/plan-tip9-lines.webp' : img(build?.plan, 'wide')

  return (
    <>
      <HeroNight facts={heroFacts} slides={heroSlides} />
      <DomMotion />
      <V2Motion />
      <div id="next" className="bridge-wrap bridge-wrap--first">
        <Bridge text="Теперь выберем, где именно проснуться" href="#estates" />
      </div>

      <section className="section v2-sec v2-sec--tint home-step" id="estates">
        <div className="container">
          <div className="v2-head" data-reveal>
            <div>
              <p className="eyebrow">Посёлки</p>
              <h2 className="title title--lg">
                Где вы <em>проснётесь</em>
              </h2>
            </div>
            <div className="v2-head__side">
              <p className="v2-head__note">
                {onSale > 0
                  ? `${onSale} ${plural(onSale, 'посёлок', 'посёлка', 'посёлков')} с домами в продаже. Выбирайте по дороге, дому и бюджету.`
                  : 'Выбирайте по дороге, дому и бюджету.'}
              </p>
              <a className="v2-link" href={mainHref('/locations')}>
                Все посёлки на карте →
              </a>
            </div>
          </div>
        </div>
        <EstateCovers estates={covers} />
        <Bridge text="Посёлок нравится — теперь выберем дом" href="#houses" />
      </section>

      {film.length > 0 && (
        <section className="section v2-sec home-step" id="houses">
          <div className="container">
            <div className="v2-head" data-reveal>
              <div>
                <p className="eyebrow">Готовые дома</p>
                <h2 className="title title--lg">
                  Выберите готовый дом <em>под свою жизнь</em>
                </h2>
              </div>
              <p className="v2-head__note">
                {free.length} {plural(free.length, 'дом', 'дома', 'домов')} с участком в продаже. Цены — из прайса застройщика.
              </p>
            </div>
            <HouseFilm houses={film} catalogHref={mainHref('/catalog')} />
          </div>
          <Bridge text="Дом приглянулся — посмотрите, где он стоит" href="#plots" />
        </section>
      )}

      {plots.length > 0 && (
        <section className="section v2-sec v2-sec--tint home-step" id="plots">
          <div className="container">
            <div className="v2-head" data-reveal>
              <div>
                <p className="eyebrow">Генплан в 3D</p>
                <h2 className="title title--lg">
                  Выберите дом и <em>место в посёлке</em>
                </h2>
              </div>
              <p className="v2-head__note">Свободные дома подписаны ценой. Нажмите на дом — откроется его страница с записью на показ.</p>
            </div>
            <PlotPicker estates={plots} />
          </div>
          <Bridge text="Место выбрано — посчитаем, сколько платить" href="#included" />
        </section>
      )}

      <section className="section v2-sec home-step" id="included">
        <div className="container">
          <Included
            finishing={company.finishing ?? []}
            programs={(company.mortgage ?? []).map((m) => ({ title: m.title, text: m.text }))}
            mortgageHref={mainHref('/mortgage')}
          />
        </div>
        <Bridge text="Осталось понять, кому доверить деньги" href="#who" />
      </section>

      <section className="section v2-sec v2-sec--tint home-step" id="who">
        <div className="container">
          <Founder
            f={{ photo: img(f?.photo, 'wide'), name: f?.name, role: f?.role, quote: f?.quote }}
            facts={facts}
            title={
              company.since ? (
                <>
                  Строим дома с {company.since} года. <em>Люди уже живут в них</em>
                </>
              ) : undefined
            }
            action={
              <a className="btn btn--green v2-founder__go" href="#lead">
                Приехать на показ
              </a>
            }
          />
          <Residents />
        </div>
        <Bridge text="Нет подходящего готового дома?" href="#build" />
      </section>

      <section className="section v2-sec home-step" id="build">
        <div className="container">
          <BuildTeaser
            plan={buildPlan}
            planNote={build ? `Проект «${build.name}»${build.area ? ` · ${build.area.toLocaleString('ru-RU')} м²` : ''}` : 'Архитектурный проект'}
            projects={projects.length}
            buildHref={mainHref('/build')}
          />
        </div>
        <Bridge text="А лучше всего — увидеть дом вживую" href="#lead" />
      </section>

      <EveningFinale
        offices={(company.offices ?? []).map((o) => ({ title: o.title, address: o.address, hours: o.hours }))}
        phone={company.phone}
      />
    </>
  )
}
