import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Catalog } from '@/components/Catalog'
import { getEstates, getHouses, getRegion } from '@/lib/data'
import { regionHref } from '@/lib/site'
import { houseView } from '@/lib/view'

export const revalidate = 60

type Props = { params: Promise<{ region: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getRegion((await params).region)
  if (!r) return {}
  return { title: `Дома в продаже: ${r.name}`, alternates: { canonical: regionHref(r.slug, '/catalog') } }
}

export default async function RegionCatalog({ params }: Props) {
  const region = await getRegion((await params).region)
  if (!region || region.status !== 'active') notFound()
  const [estates, houses] = await Promise.all([getEstates(region.id), getHouses({ region: region.id })])
  return (
    <>
      <div className="container intro">
        <nav className="crumbs" aria-label="Навигация">
          <a href={regionHref(region.slug)}>{region.name}</a>
          <span>Дома в продаже</span>
        </nav>
        <h1 className="title title--lg">Дома в продаже: {region.name}</h1>
        <p className="lead">Фильтры по посёлку, бюджету и площади. Статусы и цены обновляются по мере продаж.</p>
      </div>
      <div className="container" style={{ paddingBottom: 40 }}>
        <Catalog houses={houses.map(houseView)} estates={estates.map((e) => ({ value: e.slug, label: e.name, region: region.slug }))} />
      </div>
    </>
  )
}
