import type { Metadata } from 'next'
import { ProjectCard } from '@/components/ProjectCard'
import { getHouses, getProjects } from '@/lib/data'
import { projectCard } from '@/lib/projects'
import { mainHref } from '@/lib/site'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Проекты домов',
  description: 'Проекты кирпичных домов «Хорошего дома»: площадь, спальни, планировки. Строим под ключ за 6 месяцев.',
  alternates: { canonical: '/projects' },
}

export default async function ProjectsPage() {
  const [projects, houses] = await Promise.all([getProjects(), getHouses()])
  const areas = projects.map((p) => p.area).filter((a): a is number => !!a)
  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={mainHref('/')}>Главная</a>
          <span>Проекты</span>
        </nav>
        <h1 className="title title--lg">{projects.length} проектов домов</h1>
        <p className="lead">
          {areas.length ? `От ${Math.min(...areas)} до ${Math.max(...areas)} м². ` : ''}Выберите проект — построим капитальный дом под ключ за 6 месяцев
          или покажем готовый дом этого проекта.
        </p>
        <div className="btns">
          <a href={mainHref('/build')} className="btn btn--green">
            Как мы строим
          </a>
        </div>
      </div>
      <div className="container grid grid--3" style={{ paddingBlock: 40 }}>
        {projects.map((p) => (
          <ProjectCard key={p.slug} p={projectCard(p, houses)} />
        ))}
      </div>
    </>
  )
}
