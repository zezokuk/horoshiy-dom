import type { Metadata } from 'next'
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

// Same stages as the demo's 3D build scene (components/BuildSection there) — the 3D version comes over later.
const STAGES = [
  { title: 'Выбираете проект', text: 'Проверенные планировки — или адаптируем проект под вашу семью.' },
  { title: 'Фундамент', text: 'Основа дома — с неё начинается стройка на участке.' },
  { title: 'Стены', text: 'Капитальная коробка из сертифицированных материалов.' },
  { title: 'Кровля', text: 'Крыша по проекту — такая же, как у построенных домов в посёлках.' },
  { title: 'Окна и коммуникации', text: 'Окна, газ, вода, электричество 15 кВт, септик, отопление.' },
  { title: 'Двор и ключи', text: 'Предчистовая отделка, двор и парковка на 2 машины — заезжайте.' },
]

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

      {/* green section: the .step styles (light text, auto numbers) are made for it, as in the demo */}
      <section className="section section--green">
        <div className="container">
          <div className="head" data-reveal>
            <span className="idx">Этапы</span>
            <Words text="От проекта до *ключей*" />
          </div>
          <div className="steps">
            {STAGES.map((s, i) => (
              <div key={s.title} className="step" data-reveal style={{ ['--d' as string]: `${(i % 3) * 80}ms` }}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
          <p className="note" style={{ marginTop: 16, color: '#cfd6cd' }}>
            Примерный график — точные сроки фиксируем в договоре.
          </p>
        </div>
      </section>

      <section className="section section--paper">
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
