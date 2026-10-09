import type { Estate, House, Media, Region } from '@/payload-types'
import type { HouseStatus } from './format'
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
}

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
  return {
    code: h.code,
    title: h.title,
    area: h.area,
    mansard: h.mansard ?? null,
    plot: h.plot ?? null,
    price: h.price,
    status: h.status,
    bedrooms: h.bedrooms ?? null,
    bathrooms: h.bathrooms ?? null,
    features: h.features ?? [],
    photo: url(h.photo, 'wide'),
    photoCard: url(h.photo, 'card'),
    plan: url(h.plan, 'wide'),
    estateSlug: estate?.slug ?? '',
    estateName: estate?.name ?? '',
    regionSlug,
    href: regionHref(regionSlug, `/houses/${h.code}`),
  }
}

export function estateView(e: Estate, houses: House[]): EstateView {
  const region = obj<Region>(e.region)
  const mine = houses.filter((h) => (typeof h.estate === 'object' ? h.estate?.id : h.estate) === e.id)
  const free = mine.filter((h) => h.status === 'free')
  return {
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

export const houseTitle = (h: { title: string; area: number; mansard?: number | null }) =>
  `${h.title} · ${h.area.toLocaleString('ru-RU')} м²${h.mansard ? ` + ${h.mansard} м² мансарда` : ''}`
