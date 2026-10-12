import type { Metadata } from 'next'
import { BuildStory, type TrustPoint } from '@/components/BuildStory'
import { LeadInline } from '@/components/LeadForm'
import { ProjectCard } from '@/components/ProjectCard'
import { Words } from '@/components/Words'
import { getCompany, getEstates, getHouses, getProjects } from '@/lib/data'
import { plural } from '@/lib/format'
import { projectCard } from '@/lib/projects'
import { mainHref } from '@/lib/site'
import { houseView } from '@/lib/view'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Построить дом под ключ',
  description: 'Капитальный кирпичный дом под ключ за 6 месяцев по одному из проверенных проектов «Хорошего дома». Гарантия 5 лет.',
  alternates: { canonical: '/build' },
}

/**
 * «Построить дом». What we build is obvious — the page wins trust instead: a short run of reasons over the 3D house
 * that assembles behind them, then proof (houses that already stand), what's included, projects, questions.
 * Every fact comes from the client's own materials or from the admin.
 */
export default async function BuildPage() {
  const [company, projects, houses, estates] = await Promise.all([getCompany(), getProjects(), getHouses(), getEstates()])
  const years = company.since ? new Date().getFullYear() - company.since : null
  const homes = company.homesBuilt || estates.reduce((s, e) => s + (e.homes || 0), 0)

  // the house is built under these, one stage per card: foundation, walls, roof, windows, yard
  const points: TrustPoint[] = [
    {
      big: years ? `${years} ${plural(years, 'год', 'года', 'лет')}` : undefined,
      title: company.since ? `Строим с ${company.since} года` : 'Строим давно',
      text: `Начинали с одного таунхауса. Сегодня — ${estates.length} ${plural(estates.length, 'посёлок', 'посёлка', 'посёлков')}: ${estates.map((e) => e.name).join(', ')}.`,
    },
    {
      big: `${homes} ${plural(homes, 'дом', 'дома', 'домов')}`,
      title: company.homesBuilt ? 'Уже построили' : 'В наших посёлках',
      text: 'Не рендеры, а кирпичные дома, в которых живут семьи. Покажем их вживую — или по видеосвязи, если вы в другом городе.',
    },
    {
      title: 'Материалы с документами',
      text: 'Кирпич, кровля и инженерия — только сертифицированные. Никаких «аналогов подешевле». Бригады — одни и те же годами.',
    },
    {
      big: '6 месяцев',
      title: 'Дом под ключ',
      text: `По одному из ${projects.length} проверенных проектов — или адаптируем проект под вашу семью.`,
    },
    {
      big: '5 лет',
      title: 'Гарантия на дом',
      text: 'Устраним любые капитальные дефекты дома за свой счёт.',
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
                <a key={h.code} href={h.href} className="built__item" data-reveal style={{ ['--d' as string]: `${(i % 3) * 80}ms` }}>
                  <img src={h.photoCard} alt={`${h.title}, посёлок «${h.estateName}»`} loading="lazy" decoding="async" width={640} height={348} />
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
              <p className="lead">Сдаём с предчистовой отделкой и подключёнными коммуникациями — останется выбрать обои и мебель.</p>
            </div>
            <ul className="dots" data-reveal>
              {company.finishing.map((f) => (
                <li key={f}>{f}</li>
              ))}
              <li>Газ, вода, электричество 15 кВт и септик</li>
            </ul>
          </div>
        </section>
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
          <div className="grid grid--3">
            {projects.slice(0, 6).map((p) => (
              <ProjectCard key={p.slug} p={projectCard(p, houses)} />
            ))}
          </div>
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
