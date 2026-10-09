import type { House, Project } from '@/payload-types'
import type { ProjectCardData } from '@/components/ProjectCard'
import { img } from './data'

/** Project → card data, with how many houses of this project are for sale right now. */
export function projectCard(p: Project, houses: House[]): ProjectCardData {
  const free = houses.filter((h) => h.status === 'free' && (typeof h.project === 'object' ? h.project?.id : h.project) === p.id)
  return {
    slug: p.slug,
    name: p.name,
    area: p.area ?? null,
    mansard: p.mansard ?? null,
    storeys: p.storeys ?? null,
    bedrooms: p.bedrooms ?? null,
    photo: img(p.photo, 'wide'),
    photoCard: img(p.photo, 'card'),
    free: free.length,
  }
}
