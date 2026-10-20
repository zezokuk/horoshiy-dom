import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import type { Design, Seo } from '@/payload-types'
import type { SeoPage } from '@/globals/Seo'
import { getSeo } from './data'

type Effect = keyof NonNullable<Design['effects']>

/** An effect from «Внешний вид» → on unless switched off (a never-saved global has no values yet). */
export const effectOn = (d: Design | null | undefined, e: Effect) => d?.effects?.[e] !== false

/**
 * The client's own colours over the chosen set (design.css → html[data-palette]): the dark one drives backgrounds and
 * buttons, the accent the gold. Shades come from color-mix, so one colour is enough.
 */
export function paletteStyle(d: Design | null | undefined): CSSProperties | undefined {
  const s: Record<string, string> = {}
  if (d?.colorDark) {
    s['--green-deep'] = d.colorDark
    s['--grad-forest'] = d.colorDark
    s['--green'] = `color-mix(in srgb, ${d.colorDark} 72%, white)`
    s['--green-ink'] = `color-mix(in srgb, ${d.colorDark} 70%, black)`
    s['--grad-green-btn'] = `color-mix(in srgb, ${d.colorDark} 88%, white)`
  }
  if (d?.colorAccent) {
    s['--gold'] = d.colorAccent
    s['--grad-gold'] = `color-mix(in srgb, ${d.colorAccent} 80%, black)`
    s['--gold-soft'] = `color-mix(in srgb, ${d.colorAccent} 24%, white)`
    s['--gold-ink'] = `color-mix(in srgb, ${d.colorAccent} 55%, black)`
  }
  return Object.keys(s).length ? (s as CSSProperties) : undefined
}

/** A page's own title and description from «SEO и поиск», over the text the page builds itself. */
export function withSeo(base: Metadata, own?: { title?: string | null; description?: string | null } | null, absolute = false): Metadata {
  if (!own?.title && !own?.description) return base
  return {
    ...base,
    ...(own.title ? { title: absolute ? { absolute: own.title } : own.title } : {}),
    ...(own.description ? { description: own.description } : {}),
  }
}

/** For the site's own pages (home, «Построить», …): `export const generateMetadata = () => pageMeta('build', META)`. */
export async function pageMeta(key: SeoPage, base: Metadata): Promise<Metadata> {
  const seo: Seo = await getSeo()
  return withSeo(base, seo[key], key === 'home')
}
