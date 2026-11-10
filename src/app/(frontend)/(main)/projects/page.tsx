import type { Metadata } from 'next'
import { DraftBoard } from '@/components/DraftBoard'
import { ProjectCard } from '@/components/ProjectCard'
import { getHouses, getProjects } from '@/lib/data'
import { projectCard } from '@/lib/projects'
import { mainHref } from '@/lib/site'
import { pageMeta } from '@/lib/look'

export const revalidate = 60

const META: Metadata = {
  title: 'Проекты домов',
  description: 'Проекты кирпичных домов «Хорошего дома»: площадь, спальни, планировки. Готовые дома этих проектов — в наших посёлках.',
  alternates: { canonical: '/projects' },
}
// title and description can be set in the admin: «SEO и поиск» → projects
export const generateMetadata = () => pageMeta('projects', META)

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
          {areas.length ? `От ${Math.min(...areas)} до ${Math.max(...areas)} м². ` : ''}Выберите проект — покажем готовый дом этого проекта, а на свободном участке в нашем посёлке построим такой же.
        </p>
        <div className="btns">
          <a href={mainHref('/build')} className="btn btn--green">
            Как мы строим
          </a>
        </div>
      </div>
      {/* every project starts as a drawing: move the line between the drawing and the built «Тип 5» */}
      <div className="container" style={{ paddingTop: 32 }}>
        <DraftBoard caption="«Тип 5»: чертёж и построенный дом · проведите мышью" />
      </div>
      <div className="container grid grid--3" style={{ paddingBlock: 40 }}>
        {projects.map((p) => (
          <ProjectCard key={p.slug} p={projectCard(p, houses)} />
        ))}
      </div>
    </>
  )
}
