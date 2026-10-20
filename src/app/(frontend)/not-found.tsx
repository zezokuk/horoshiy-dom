import type { Metadata } from 'next'
import { Shell } from '@/components/Shell'
import { getHouses, getProjects } from '@/lib/data'
import { plural } from '@/lib/format'
import { mainHref } from '@/lib/site'

export const metadata: Metadata = { title: 'Страница не найдена' }

/**
 * The site's own 404: for notFound() in any page and, through (main)/[...rest], for every unknown address.
 * The house sketch draws itself in: «здесь дом только на чертеже» — the real ones are a click away, with live counts.
 * No headers() here (no region header on a subdomain's 404): Next renders not-found into every page, and a dynamic
 * API in it turned every static page dynamic (/privacy, /projects, /build… — seen in the 20.10 build).
 */
export default async function NotFound() {
  const [houses, projects] = await Promise.all([getHouses(), getProjects()])
  const free = houses.filter((h) => h.status === 'free').length
  const links = [
    {
      href: mainHref('/catalog'),
      label: 'Готовые дома',
      note: free ? `${free} ${plural(free, 'свободен', 'свободно', 'свободно')}` : '',
    },
    {
      href: mainHref('/build'),
      label: 'Построить по проекту',
      note: projects.length
        ? `${projects.length} ${plural(projects.length, 'проект', 'проекта', 'проектов')}`
        : '',
    },
    { href: mainHref('/locations'), label: 'Посёлки на карте', note: '' },
    { href: mainHref('/'), label: 'На главную', note: '' },
  ]
  return (
    <Shell>
      <section className="nf">
        <div className="container nf__in">
          <div className="nf__text">
            <p className="eyebrow">Ошибка 404</p>
            <h1 className="nf__title">Такой страницы нет</h1>
            <p className="lead">
              Возможно, ссылка устарела или в адресе опечатка. Дома никуда не делись:
            </p>
            <ul className="nf__links">
              {links.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>
                    {l.label}
                    {l.note && <i>{l.note}</i>}
                    <span aria-hidden>→</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <figure className="nf__art" aria-hidden>
            <span className="nf__code">404</span>
            <img src="/design/sketch-tip5-900.webp" alt="" />
            <figcaption>Здесь дом только на чертеже</figcaption>
          </figure>
        </div>
      </section>
    </Shell>
  )
}
