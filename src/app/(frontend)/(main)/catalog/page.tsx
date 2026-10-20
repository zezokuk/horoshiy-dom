import type { Metadata } from 'next'
import { Catalog } from '@/components/Catalog'
import { HouseStack } from '@/components/HouseStack'
import { getDesign, getEstates, getHouses, getRegions } from '@/lib/data'
import { formatMillions, plural } from '@/lib/format'
import { houseView } from '@/lib/view'
import { effectOn, pageMeta } from '@/lib/look'

export const dynamic = 'force-dynamic' // shows statuses and counts: always fresh (see collections/revalidate.ts)

const META: Metadata = {
  title: 'Готовые дома в продаже',
  description: 'Все свободные дома «Хорошего дома» во всех регионах: фильтры по региону, посёлку, бюджету и площади.',
  alternates: { canonical: '/catalog' },
}
// title and description can be set in the admin: «SEO и поиск» → catalog
export const generateMetadata = () => pageMeta('catalog', META)

export default async function CatalogPage() {
  const [regions, estates, houses, design] = await Promise.all([getRegions(), getEstates(), getHouses(), getDesign()])
  const active = regions.filter((r) => r.status === 'active')
  const slugOf = (id: unknown) => regions.find((r) => r.id === (typeof id === 'object' && id ? (id as { id: number }).id : id))?.slug ?? ''
  const free = houses.filter((h) => h.status === 'free').map(houseView).sort((a, b) => a.price - b.price)
  return (
    <>
      <div className="container intro keyban">
        <div className="keyban__text">
          <nav className="crumbs" aria-label="Навигация">
            <a href="/">Главная</a>
            <span>Готовые дома</span>
          </nav>
          <h1 className="title title--lg">Готовые дома в продаже</h1>
          <p className="lead">Кирпичные дома с участком и предчистовой отделкой. Статусы и цены обновляются по мере продаж.</p>
        </div>
        {/* facts only (free houses from the admin, the company's advantages) and the cheapest free houses as a fan
            of photos. Phones: a small fan beside the facts, so the list of houses stays near the top */}
        <div className="keyban__row">
          <ul className="keyban__facts">
            {free.length > 0 && (
              <li>
                <b>{free.length}</b> {plural(free.length, 'дом свободен', 'дома свободны', 'домов свободно')}, от {formatMillions(free[0].price)}
              </li>
            )}
            <li>
              <b>2 недели</b> — ипотека и регистрация
            </li>
            <li>
              <b>Ключи</b> — после сделки
            </li>
          </ul>
          {effectOn(design, 'key') && <HouseStack houses={free} />}
        </div>
      </div>
      <div className="container" style={{ paddingBottom: 40 }}>
        <Catalog
          houses={houses.map(houseView)}
          regions={active.map((r) => ({ value: r.slug, label: r.name }))}
          estates={estates.filter((e) => e.status !== 'planned').map((e) => ({ value: e.slug, label: e.name, region: slugOf(e.region) }))}
        />
      </div>
    </>
  )
}
