import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

/**
 * A change in the admin shows on the site at once, not after the 60-second page cache. The site is small, so the
 * whole cache is dropped (cheaper than tracking which pages show which house). Outside Next (npm run seed) there is
 * no cache to drop — ignore.
 *
 * Not enough on its own for statuses: a visit just before a save may start a background rebuild that read the OLD
 * data and stores it after this drop (tools/meetingtest.py caught the home page stuck on the old count for a minute).
 * So the pages that show statuses and counts (home, catalog, locations, about; region, estate and house pages)
 * render on every request; this drop is for the rest (build, projects, mortgage, contacts).
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
