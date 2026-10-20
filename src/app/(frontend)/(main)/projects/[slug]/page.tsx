import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HouseCard } from '@/components/HouseCard'
import { LeadInline } from '@/components/LeadForm'
import { getCompany, getHouses, getProject, img } from '@/lib/data'
import { withSeo } from '@/lib/look'
import { formatArea, formatMillions, plural } from '@/lib/format'
import { mainHref } from '@/lib/site'
import { houseView } from '@/lib/view'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProject((await params).slug)
  if (!p) return {}
  // «SEO» fields of the project in the admin win over the text built here
  return withSeo({
    title: `Проект «${p.name}»${p.area ? `, ${formatArea(p.area)} м²` : ''}`,
    description: `Проект дома «${p.name}»: ${p.area ? `${formatArea(p.area)} м²` : 'площадь по проекту'}${p.mansard ? ` + ${formatArea(p.mansard)} м² мансарда` : ''}, ${p.bedrooms ? `${p.bedrooms} ${plural(p.bedrooms, 'спальня', 'спальни', 'спален')}` : 'спальни по проекту'}. Строим под ключ за 6 месяцев.`,
    alternates: { canonical: `/projects/${p.slug}` },
  }, p.seo)
}

export default async function ProjectPage({ params }: Props) {
  const p = await getProject((await params).slug)
  if (!p) notFound()
  const [company, houses] = await Promise.all([getCompany(), getHouses()])
  const mine = houses.filter((h) => (typeof h.project === 'object' ? h.project?.id : h.project) === p.id).map(houseView)
  const free = mine.filter((h) => h.status === 'free')
  const photo = img(p.photo, 'wide')
  const plan = img(p.plan, 'wide')

  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={mainHref('/')}>Главная</a>
          <a href={mainHref('/projects')}>Проекты</a>
          <span>{p.name}</span>
        </nav>
      </div>
      <div className="container house">
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="house__photo">{photo && <img src={photo} alt={`Дом по проекту «${p.name}»`} fetchPriority="high" />}</div>
          {plan && (
            <div className="plan">
              <img src={plan} alt={`Планировка проекта «${p.name}»`} loading="lazy" />
            </div>
          )}
        </div>
        <aside className="house__side">
          <p className="eyebrow">Проект дома</p>
          <h1 className="title title--md">
            {p.name}
            {p.area ? ` · ${p.area.toLocaleString('ru-RU')} м²` : ''}
          </h1>
          {!!p.mansard && <p className="lead">+ {p.mansard} м² мансарда</p>}
          <div className="specs">
            <div>
              <b>{p.storeys === 2 ? '2' : '1'}</b>
              <span>{p.storeys === 2 ? 'этажа' : 'этаж'}</span>
            </div>
            <div>
              <b>{p.bedrooms ?? '—'}</b>
              <span>спальни</span>
            </div>
            <div>
              <b>{p.bathrooms ?? '—'}</b>
              <span>санузлы</span>
            </div>
            <div>
              <b>6 мес.</b>
              <span>стройка под ключ</span>
            </div>
          </div>
          {!!p.features?.length && (
            <div className="chips">
              {p.features.map((f) => (
                <span key={f} className="chip">
                  {f}
                </span>
              ))}
            </div>
          )}
          {free.length > 0 && (
            <p>
              Готовых домов этого проекта в продаже: <b>{free.length}</b>, от {formatMillions(Math.min(...free.map((h) => h.price)))}.
            </p>
          )}
          <a href="#lead" className="btn btn--gold">
            Построить такой дом
          </a>
        </aside>
      </div>

      {mine.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="head">
              <p className="eyebrow">Уже построены</p>
              <h2 className="title title--md">Дома по проекту «{p.name}»</h2>
            </div>
            <div className="grid grid--3">
              {[...mine].sort((a, b) => Number(b.status === 'free') - Number(a.status === 'free')).map((h) => (
                <HouseCard key={h.code} h={h} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="container">
        <LeadInline
          title={`Построить дом «${p.name}»`}
          text="Оставьте телефон — расскажем о сроках, этапах и стоимости строительства."
          cta="Рассчитать стройку"
          target={{ context: `Стройка: проект ${p.name}`, phone: company.phone }}
        />
      </div>
    </>
  )
}
