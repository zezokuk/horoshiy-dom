import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/**
 * A change in the admin shows on the site at once, not after the 60-second page cache: «поменял статус на продан —
 * обновил страницу — дом красный». The site is small, so the whole cache is dropped (cheaper than tracking which
 * pages show which house). Outside Next (npm run seed) there is no cache to drop — ignore.
 */
function dropCache() {
  try {
    revalidatePath('/', 'layout')
  } catch {
    // not inside a Next request (seed script)
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  dropCache()
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  dropCache()
  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc }) => {
  dropCache()
  return doc
}
