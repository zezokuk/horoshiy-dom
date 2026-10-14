import type { Metadata } from 'next'
import { Catalog } from '@/components/Catalog'
import { getEstates, getHouses, getRegions } from '@/lib/data'
import { houseView } from '@/lib/view'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Готовые дома в продаже',
  description: 'Все свободные дома «Хорошего дома» во всех регионах: фильтры по региону, посёлку, бюджету и площади.',
  alternates: { canonical: '/catalog' },
}

export default async function CatalogPage() {
  const [regions, estates, houses] = await Promise.all([getRegions(), getEstates(), getHouses()])
  const active = regions.filter((r) => r.status === 'active')
  const slugOf = (id: unknown) => regions.find((r) => r.id === (typeof id === 'object' && id ? (id as { id: number }).id : id))?.slug ?? ''
  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href="/">Главная</a>
          <span>Готовые дома</span>
        </nav>
        <h1 className="title title--lg">Готовые дома в продаже</h1>
        <p className="lead">Кирпичные дома с участком и предчистовой отделкой. Статусы и цены обновляются по мере продаж.</p>
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
