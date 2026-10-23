import type { Metadata } from 'next'
import { BuildStory, type TrustPoint } from '@/components/BuildStory'
import { LeadInline } from '@/components/LeadForm'
import { ProjectCard } from '@/components/ProjectCard'
import { ProjectFan } from '@/components/ProjectFan'
import { SketchToHouse } from '@/components/SketchToHouse'
import { Words } from '@/components/Words'
import { getCompany, getDesign, getEstates, getHouses, getProjects } from '@/lib/data'
import { plural } from '@/lib/format'
import { projectCard } from '@/lib/projects'
import { mainHref } from '@/lib/site'
import { houseView } from '@/lib/view'
import { effectOn, pageMeta } from '@/lib/look'

export const revalidate = 60

const META: Metadata = {
  title: 'Построить дом под ключ',
  description:
    'Капитальный кирпичный дом под ключ за 6 месяцев по одному из проверенных проектов «Хорошего дома». Гарантия 5 лет.',
  alternates: { canonical: '/build' },
}
// title and description can be set in the admin: «SEO и поиск» → build
export const generateMetadata = () => pageMeta('build', META)

/**
 * «Построить дом». What we build is obvious — the page wins trust instead: a short run of reasons over the 3D house
 * that assembles behind them, then proof (houses that already stand), what's included, projects, questions.
 * Every fact comes from the client's own materials or from the admin.
 */
export default async function BuildPage() {
  const [company, projects, houses, estates, design] = await Promise.all([
    getCompany(),
    getProjects(),
    getHouses(),
    getEstates(),
    getDesign(),
  ])
  const years = company.since ? new Date().getFullYear() - company.since : null
  const homes = company.homesBuilt || estates.reduce((s, e) => s + (e.homes || 0), 0)
  // a planned estate («Скоро») has no houses yet — it is not one the company has built
  const built = estates.filter((e) => e.status !== 'planned')

  // the house is built under these, one stage per card: foundation, walls, roof, windows, yard
  const points: TrustPoint[] = [
    {
      big: years ? `${years} ${plural(years, 'год', 'года', 'лет')}` : undefined,
      title: company.since ? `Строим с ${company.since} года` : 'Строим давно',
      text: `Начинали с одного таунхауса. Сегодня — ${built.length} ${plural(built.length, 'посёлок', 'посёлка', 'посёлков')}: ${built.map((e) => e.name).join(', ')}.`,
    },
    {
      big: `${homes} ${plural(homes, 'дом', 'дома', 'домов')}`,
      title: company.homesBuilt ? 'Уже построили' : 'В наших посёлках',
      text: 'Не рендеры, а кирпичные дома, в которых живут семьи. Покажем их вживую — или по видеосвязи, если вы в другом городе.',
    },
    {
      title: 'Материалы с документами',
      text: 'Кирпич, кровля и инженерия — только сертифицированные. Никаких «аналогов подешевле».',
    },
    {
      big: '6 месяцев',
      title: 'Дом под ключ',
      text: `По одному из ${projects.length} проверенных проектов — или адаптируем проект под вашу семью.`,
    },
    {
      big: '5 лет',
      title: 'Гарантия на дом',
      text: 'Гарантия 5 лет на капитальные дефекты дома.',
    },
  ]

  // proof: real photos of houses that stand in our estates, one per estate first (Тип 12 is a render — skip it)
  const real = houses.map(houseView).filter((h) => h.photoCard && !h.title.startsWith('Тип 12'))
  const proof = [...new Map(real.map((h) => [h.estateSlug, h])).values(), ...real]
    .filter((h, i, a) => a.findIndex((x) => x.code === h.code) === i)
    .slice(0, 6)
  const faq = (company.faq || []).filter((f) => /постро|гарант|посмотреть|ипотек/i.test(f.q))

  return (
    <>
      <BuildStory
        points={points}
        intro={
          <>
            <nav className="crumbs" aria-label="Навигация">
              <a href={mainHref('/')}>Главная</a>
              <span>Построить дом</span>
            </nav>
            <h1 className="title title--lg">Построим ваш дом за 6 месяцев</h1>
            <p>Почему семьи доверяют стройку нам — пока листаете, дом построится.</p>
            <span className="build3d__mouse" aria-hidden />
          </>
        }
        end={
          <>
            <h3>Дом готов — заезжайте</h3>
            <p>Ипотеку и регистрацию оформим за 2 недели: семейная, IT, военная.</p>
            <p className="story__note">Мебель на макете — для примера: дом сдаём с предчистовой отделкой.</p>
            <div className="btns">
              <a href="#calc" className="btn btn--gold">
                Рассчитать стройку
              </a>
              <a href="#projects" className="btn btn--ghost">
                Выбрать проект
              </a>
            </div>
          </>
        }
      />

      {proof.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="head head--split">
              <div style={{ display: 'grid', gap: 14 }} data-reveal>
                <span className="idx">Это построили мы</span>
                <Words text="Дома, которые уже *стоят*" />
              </div>
              <a href={mainHref('/locations')} className="btn btn--green" data-reveal>
                Все посёлки
              </a>
            </div>
            <div className="built">
              {proof.map((h, i) => (
                <a
                  key={h.code}
                  href={h.href}
                  className="built__item"
                  data-reveal
                  style={{ ['--d' as string]: `${(i % 3) * 80}ms` }}
                >
                  <img
                    src={h.photoCard}
                    alt={`${h.title}, посёлок «${h.estateName}»`}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={348}
                  />
                  <span>
                    <b>{h.estateName}</b> · {h.title.split(' (')[0]}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {!!company.finishing?.length && (
        <section className="section section--paper">
          <div className="container split" style={{ alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">Что получите</span>
              <Words text="Дом, в который можно *заезжать*" />
              <p className="lead">
                Сдаём с предчистовой отделкой — останется выбрать обои и мебель.
              </p>
            </div>
            <ul className="dots" data-reveal>
              {company.finishing.map((f) => (
                <li key={f}>{f}</li>
              ))}
              {/* the client's own words: «вода, 15 кВт, септик, возможность подключить газ» */}
              <li>Вода (центральная или скважина), электричество 15 кВт и септик, газ можно подключить</li>
            </ul>
          </div>
        </section>
      )}

      {/* references 5–6: how one of the projects became a real house (its plan, a sketch from its photo, the photo) */}
      {effectOn(design, 'sketch') && (
        <SketchToHouse
          steps={[
            {
              title: 'Проект',
              text: '«Тип 5»: 3 спальни, 2 санузла, кухня-гостиная 27,2 м², терраса 19 м². Один из 12 наших проектов.',
            },
            {
              title: 'Каркас',
              text: 'Фундамент, кирпичные стены, кровля — материалы только с документами.',
            },
            { title: 'Дом', text: 'Капитальный дом под ключ за 6 месяцев. Гарантия 5 лет.' },
          ]}
          caption="Построенный дом по проекту «Тип 5», 105 м²"
        />
      )}

      <section className="section" id="projects">
        <div className="container">
          <div className="head head--split">
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">Проекты</span>
              <Words text="Выберите *проект*" />
            </div>
            <a href={mainHref('/projects')} className="btn btn--green" data-reveal>
              Все {projects.length} {plural(projects.length, 'проект', 'проекта', 'проектов')}
            </a>
          </div>
          {/* reference 49d13…: the chosen project in the hub, the others as a fan of photos around it («Внешний вид»: or the grid) */}
          {effectOn(design, 'fan') ? (
            <>
              <ProjectFan
                projects={projects.map((p) => ({
                  ...projectCard(p, houses),
                  href: mainHref(`/projects/${p.slug}`),
                }))}
                first="tip-5"
              />
              <noscript>
                <div className="grid grid--3">
                  {projects.slice(0, 6).map((p) => (
                    <ProjectCard key={p.slug} p={projectCard(p, houses)} />
                  ))}
                </div>
              </noscript>
            </>
          ) : (
            <div className="grid grid--3">
              {projects.slice(0, 6).map((p) => (
                <ProjectCard key={p.slug} p={projectCard(p, houses)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section--paper" id="calc">
        <div className="container">
          <LeadInline
            title="Рассчитаем стройку"
            text="Расскажите, где хотите строить и какой дом нужен — посчитаем сроки и стоимость."
            cta="Рассчитать стройку"
            target={{ context: 'Стройка: расчёт', phone: company.phone, interest: 'build' }}
          />
        </div>
      </section>

      {faq.length > 0 && (
        <section className="section">
          <div className="container split" style={{ alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">Вопросы</span>
              <Words text="Про стройку и *гарантию*" />
            </div>
            <div className="faq" data-reveal>
              {faq.map((f) => (
                <details key={f.id ?? f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
