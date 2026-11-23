import type { Estate, House, Media, Project, Promo, Region } from '@/payload-types'
import { plural, type HouseStatus } from './format'
import { genplanConfig, type GenplanEstate } from './genplan'
import { regionHref } from './site'

/**
 * Plain, serializable shapes for client components (cards, catalog, search, 3D plan).
 * Server pages map Payload documents into these, so client code never imports the database layer.
 */
export type HouseView = {
  code: string
  title: string
  area: number
  mansard: number | null
  /** from the project (Тип 9, 10 — two storeys); the 3D plan draws one-storey, attic (mansard) and two-storey houses differently */
  storeys?: 1 | 2
  plot: string | null
  price: number
  status: HouseStatus
  bedrooms: number | null
  bathrooms: number | null
  features: string[]
  photo?: string
  photoCard?: string
  plan?: string
  estateSlug: string
  estateName: string
  regionSlug: string
  href: string
  plotNo: number | null
}

export type EstateView = {
  slug: string
  name: string
  place: string
  regionSlug: string
  regionName: string
  cover?: string
  coverCard?: string
  lat: number | null
  lng: number | null
  free: number
  priceFrom: number | null
  href: string
  /** selling · soldOut (built and sold: shown as the company's scale, not for sale) · planned (sales start soon) */
  status: EstateStatus
  homes: number | null
}

export type EstateStatus = 'selling' | 'soldOut' | 'planned'

/** One line about an estate's sales for cards, map popups and lists — no «0 домов». */
export function estateSale(e: Pick<EstateView, 'status' | 'free' | 'homes'>) {
  if (e.status === 'planned') return 'Старт продаж скоро'
  if (e.status === 'soldOut' || !e.free) return e.homes ? `Продан · ${e.homes} ${plural(e.homes, 'дом', 'дома', 'домов')}` : 'Все дома проданы'
  return `${e.free} ${plural(e.free, 'дом', 'дома', 'домов')} в продаже`
}

/** Lists put what can be bought first, then sold-out estates as proof of scale; «Скоро» is always last. */
const estateRank = (e: { status: EstateStatus; free: number }) => (e.status === 'planned' ? 2 : e.free ? 0 : 1)
export const byEstateStatus = <T extends { status: EstateStatus; free: number }>(list: T[]) =>
  [...list].sort((a, b) => estateRank(a) - estateRank(b)) // stable: the admin's order inside each group

export type RegionView = {
  slug: string
  name: string
  shortName: string
  status: 'active' | 'soon' | 'hidden'
  tagline: string | null
  mapCodes: string[]
  lat: number | null
  lng: number | null
  phone: string | null
  href: string
}

const url = (m: number | Media | null | undefined, size?: 'card' | 'wide') =>
  m && typeof m === 'object' ? (size && m.sizes?.[size]?.url) || m.url || undefined : undefined
const obj = <T>(v: unknown): T | null => (v && typeof v === 'object' ? (v as T) : null)

const WEED_AND_TOY_PHOTO_RX = /(?:photo-(?:16420342|16420352|14427948|14427965|12042894|12050447)|type5-(?:day|evening|night)\.webp)/i

/** Подменяет устаревшие фото с сорняками и 3D-пластик на чистый фасад из фотосессии клиента. */
export function cleanPhotoUrl(u: string | undefined): string | undefined {
  if (!u) return u
  return WEED_AND_TOY_PHOTO_RX.test(u) ? '/v4/houses/type5-front.webp' : u
}

export function regionView(r: Region): RegionView {
  return {
    slug: r.slug,
    name: r.name,
    shortName: r.shortName,
    status: r.status,
    tagline: r.tagline ?? null,
    mapCodes: r.mapCodes ?? [],
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    phone: r.office?.phone ?? null,
    href: regionHref(r.slug),
  }
}

export function houseView(h: House): HouseView {
  const estate = obj<Estate>(h.estate)
  const region = obj<Region>(estate?.region) ?? obj<Region>(h.region)
  const regionSlug = region?.slug ?? ''
  // a house just added in the admin may have no pictures yet: its project's photo and plan stand in
  const project = obj<Project>(h.project)
  return {
    code: h.code,
    title: h.title,
    area: h.area,
    mansard: h.mansard ?? null,
    storeys: project?.storeys === 2 ? 2 : project ? 1 : undefined,
    plot: h.plot ?? null,
    price: h.price,
    status: h.status,
    bedrooms: h.bedrooms ?? null,
    bathrooms: h.bathrooms ?? null,
    features: h.features ?? [],
    photo: cleanPhotoUrl(url(h.photo, 'wide') ?? url(project?.photo, 'wide')),
    photoCard: cleanPhotoUrl(url(h.photo, 'card') ?? url(project?.photo, 'card')),
    plan: url(h.plan, 'wide') ?? url(project?.plan, 'wide'),
    estateSlug: estate?.slug ?? '',
    estateName: estate?.name ?? '',
    regionSlug,
    href: regionHref(regionSlug, `/houses/${h.code}`),
    plotNo: h.plotNo ?? null,
  }
}

export function estateView(e: Estate, houses: House[]): EstateView {
  const region = obj<Region>(e.region)
  const mine = houses.filter((h) => (typeof h.estate === 'object' ? h.estate?.id : h.estate) === e.id)
  const status: EstateStatus = e.status ?? 'selling'
  const free = mine.filter((h) => h.status === 'free')
  return {
    status,
    homes: e.homes ?? null,
    slug: e.slug,
    name: e.name,
    place: e.place ?? '',
    regionSlug: region?.slug ?? '',
    regionName: region?.name ?? '',
    cover: url(e.cover, 'wide'),
    coverCard: url(e.cover, 'card'),
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    free: free.length,
    priceFrom: free.length ? Math.min(...free.map((h) => h.price)) : null,
    href: regionHref(region?.slug ?? '', `/objects/${e.slug}`),
  }
}

/** A point on the house plan that opens a room video. x, y — percent of the plan picture.
 *  No video yet (the client films the rooms later): the point opens its cover or a «video coming» card. */
export type TourPoint = { n: number; label: string; x: number; y: number; video?: string; poster?: string }

export function tourView(p: Project | null | undefined): TourPoint[] {
  // «1 м²» never breaks between the number and the unit
  const label = (s: string) => s.replace(/(\d)\s+(?=м²|м2|см\b)/g, '$1 ')
  return (p?.tour ?? []).map((t, i) => ({ n: i + 1, label: label(t.label), x: t.x, y: t.y, video: url(t.video), poster: url(t.poster, 'card') }))
}

/** Room labels over the project's plan render (name and area from the plan, x/y — percent of the render). */
export type RoomLabel = { name: string; area: number; x: number; y: number }

export function roomsView(p: Project | null | undefined): RoomLabel[] {
  return (p?.rooms ?? []).map((r) => ({ name: r.name, area: r.area, x: r.x, y: r.y }))
}

export type PromoView ={ id: number; title: string; text: string | null; image?: string; regionName: string | null; href: string; cta: string }

export function promoView(p: Promo): PromoView {
  return {
    id: p.id,
    title: p.title,
    text: p.text ?? null,
    image: url(p.image, 'card'),
    regionName: obj<Region>(p.region)?.name ?? null,
    href: p.link || '#lead',
    cta: p.cta || 'Узнать условия',
  }
}

/** The estate's part of the 3D plan / scheme. `houses` = how many houses it has now, so none drops off the plan. */
export function genplanEstate(e: Estate, houses: number): GenplanEstate {
  return {
    slug: e.slug,
    name: e.name,
    streets: e.streets ?? [],
    poster: url(e.poster, 'wide'),
    config: genplanConfig(e.genplan, e.homes ?? 0, houses),
  }
}

export const houseTitle =(h: { title: string; area: number; mansard?: number | null }) =>
  `${h.title} · ${h.area.toLocaleString('ru-RU')} м²${h.mansard ? ` + ${h.mansard} м² мансарда` : ''}`
