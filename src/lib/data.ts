import { cache } from 'react'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import type { Company, Estate, House, Media, Project, Region } from '@/payload-types'

/**
 * All reads go through Payload's Local API (no HTTP): fast, typed, and the same access rules as the admin.
 * `cache` dedupes calls within one render (header + page asking for the same region).
 */
export const payloadClient = cache(async () => getPayload({ config }))

// depth 1: uploads (hero photo) come as documents with URLs, not bare ids
export const getCompany = cache(async (): Promise<Company> => (await payloadClient()).findGlobal({ slug: 'company', depth: 1 }))

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

export const getEstates = cache(async (regionId?: number): Promise<Estate[]> => {
  const p = await payloadClient()
  const { docs } = await p.find({
    collection: 'estates',
    where: regionId ? { region: { equals: regionId } } : {},
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
