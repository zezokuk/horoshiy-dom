import type { Metadata } from 'next'
import { BuildSection } from '@/components/BuildSection'
import { LeadInline } from '@/components/LeadForm'
import { ProjectCard } from '@/components/ProjectCard'
import { Words } from '@/components/Words'
import { getCompany, getHouses, getProjects } from '@/lib/data'
import { projectCard } from '@/lib/projects'
import { mainHref } from '@/lib/site'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Построить дом под ключ',
  description: 'Капитальный кирпичный дом под ключ за 6 месяцев по одному из проверенных проектов «Хорошего дома».',
  alternates: { canonical: '/build' },
}

export default async function BuildPage() {
  const [company, projects, houses] = await Promise.all([getCompany(), getProjects(), getHouses()])
  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={mainHref('/')}>Главная</a>
          <span>Построить дом</span>
        </nav>
        <h1 className="title title--lg">Построим капитальный дом за 6 месяцев</h1>
        <p className="lead">
          По одному из {projects.length} проверенных проектов: те же кирпичные дома, что стоят в наших посёлках. Гарантия 5 лет на капитальные дефекты.
        </p>
      </div>

      {/* the house assembles in 3D while the page scrolls; the stage list is server-rendered inside it */}
      <BuildSection projects={projects.length} ctaHref="#calc" />

      <section className="section section--paper" id="calc">
        <div className="container">
          <div className="head head--split">
            <div style={{ display: 'grid', gap: 14 }} data-reveal>
              <span className="idx">Проекты</span>
              <Words text="Выберите *проект*" />
            </div>
            <a href={mainHref('/projects')} className="btn btn--green" data-reveal>
              Все проекты
            </a>
          </div>
          <div className="grid grid--3">
            {projects.slice(0, 6).map((p) => (
              <ProjectCard key={p.slug} p={projectCard(p, houses)} />
            ))}
          </div>
          <LeadInline
            title="Рассчитаем стройку"
            text="Расскажите, где хотите строить и какой дом нужен — посчитаем сроки и стоимость."
            cta="Рассчитать стройку"
            target={{ context: 'Стройка: расчёт', phone: company.phone }}
          />
        </div>
      </section>
    </>
  )
}
