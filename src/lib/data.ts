import { cache } from 'react'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import type { Company, Design, Estate, House, Landing, Media, Project, Promo, Region, Seo } from '@/payload-types'

/**
 * All reads go through Payload's Local API (no HTTP): fast, typed, and the same access rules as the admin.
 * `cache` dedupes calls within one render (header + page asking for the same region).
 */
export const payloadClient = cache(async () => getPayload({ config }))

// depth 1: uploads (hero photo) come as documents with URLs, not bare ids
export const getCompany = cache(async (): Promise<Company> => (await payloadClient()).findGlobal({ slug: 'company', depth: 1 }))

/** «Внешний вид»: first screen, colours, effects (globals/Design). Never saved yet — the defaults. */
export const getDesign = cache(async (): Promise<Design> => (await payloadClient()).findGlobal({ slug: 'design', depth: 0 }))

/** «SEO и поиск»: page titles, confirmation codes, the share picture (globals/Seo). */
export const getSeo = cache(async (): Promise<Seo> => (await payloadClient()).findGlobal({ slug: 'seo', depth: 1 }))

/** Public regions for menus and the map (hidden ones are drafts). */
export const getRegions = cache(async (): Promise<Region[]> => {
  const p = await payloadClient()
  const { docs } = await p.find({ collection: 'regions', where: { status: { not_equals: 'hidden' } }, sort: 'order', depth: 1, limit: 100 })
  return docs
})

export const getRegion = cache(async (slug: string): Promise<Region | null> => {
  const p = await payloadClient()
  const { docs } = await p.find({ collection: 'regions', where: { slug: { equals: slug }, status: { not_equals: 'hidden' } }, depth: 1, limit: 1 })
  return docs[0] ?? null
})

/** Ids of the regions a visitor may see. Company-wide lists (home, /locations, /catalog) use it so that a draft
 *  estate in a hidden region never shows up there and never links to its 404. */
const publicRegionIds = async () => {
  const ids = (await getRegions()).map((r) => r.id)
  return ids.length ? ids : [0] // no public region at all: match nothing rather than send an empty «in»
}

export const getEstates = cache(async (regionId?: number): Promise<Estate[]> => {
  const p = await payloadClient()
  const { docs } = await p.find({
    collection: 'estates',
    where: regionId ? { region: { equals: regionId } } : { region: { in: await publicRegionIds() } },
    sort: 'order',
    depth: 1,
    limit: 200,
  })
  return docs
})

export const getEstate = cache(async (slug: string): Promise<Estate | null> => {
  const p = await payloadClient()
  const { docs } = await p.find({ collection: 'estates', where: { slug: { equals: slug } }, depth: 1, limit: 1 })
  return docs[0] ?? null
})

type HouseFilter = { region?: number; estate?: number; status?: House['status'] }
export const getHouses = cache(async (f: HouseFilter = {}): Promise<House[]> => {
  const p = await payloadClient()
  const and: Where[] = []
  if (f.region) and.push({ region: { equals: f.region } })
  else if (!f.estate) and.push({ region: { in: await publicRegionIds() } })
  if (f.estate) and.push({ estate: { equals: f.estate } })
  if (f.status) and.push({ status: { equals: f.status } })
  const { docs } = await p.find({ collection: 'houses', where: and.length ? { and } : {}, sort: 'price', depth: 2, limit: 500 })
  return docs
})

export const getHouse = cache(async (code: string): Promise<House | null> => {
  const p = await payloadClient()
  const { docs } = await p.find({ collection: 'houses', where: { code: { equals: code } }, depth: 2, limit: 1 })
  return docs[0] ?? null
})

export const getProjects = cache(async (): Promise<Project[]> => {
  const p = await payloadClient()
  const { docs } = await p.find({ collection: 'projects', sort: 'order', depth: 1, limit: 100 })
  return docs
})

export const getProject = cache(async (slug: string): Promise<Project | null> => {
  const p = await payloadClient()
  const { docs } = await p.find({ collection: 'projects', where: { slug: { equals: slug } }, depth: 1, limit: 1 })
  return docs[0] ?? null
})

/** A promo page of a region (ads landing); only active ones. */
export const getLanding = cache(async (regionId: number, slug: string): Promise<Landing | null> => {
  const p = await payloadClient()
  const { docs } = await p.find({
    collection: 'landings',
    where: { and: [{ slug: { equals: slug } }, { region: { equals: regionId } }, { active: { equals: true } }] },
    depth: 2,
    limit: 1,
  })
  return docs[0] ?? null
})

export const getLandings = cache(async (regionId: number): Promise<Landing[]> => {
  const p = await payloadClient()
  const { docs } = await p.find({ collection: 'landings', where: { and: [{ region: { equals: regionId } }, { active: { equals: true } }] }, depth: 0, limit: 100 })
  return docs
})

/** Active promos. Brand pages (no region): all of them, regional ones carry their region. A region: company-wide + its own.
 *  Expired ones hide themselves. */
export const getPromos = cache(async (regionId?: number): Promise<Promo[]> => {
  const p = await payloadClient()
  const today = new Date().toISOString().slice(0, 10)
  const { docs } = await p.find({
    collection: 'promos',
    where: {
      and: [
        { active: { equals: true } },
        { or: [{ until: { exists: false } }, { until: { greater_than_equal: today } }] },
        { or: [{ region: { exists: false } }, { region: regionId ? { equals: regionId } : { in: await publicRegionIds() } }] },
      ],
    },
    sort: 'order',
    depth: 1,
    limit: 12,
  })
  return docs
})

// ---------- helpers for templates ----------

/** URL of an uploaded image in a given size ('card' 640 px, 'wide' 1600 px), falling back to the original. */
export function img(m: number | Media | null | undefined, size?: 'card' | 'wide') {
  if (!m || typeof m === 'number') return undefined
  return (size && m.sizes?.[size]?.url) || m.url || undefined
}

/** srcset for <img>: card + wide + original. */
export function srcSet(m: number | Media | null | undefined) {
  if (!m || typeof m === 'number') return undefined
  const parts = [
    m.sizes?.card?.url && `${m.sizes.card.url} ${m.sizes.card.width}w`,
    m.sizes?.wide?.url && `${m.sizes.wide.url} ${m.sizes.wide.width}w`,
    m.url && m.width && `${m.url} ${m.width}w`,
  ].filter(Boolean)
  return parts.join(', ') || undefined
}

export const rel = <T extends { id: number }>(v: number | T | null | undefined): T | null => (v && typeof v === 'object' ? v : null)

export * from './format'
