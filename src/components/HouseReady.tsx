'use client'

import { useLayoutEffect } from 'react'
import { morph } from '@/lib/morph'

/**
 * On the house page: if we arrived through the 3D plan transition, jump to the top (hidden under the
 * transition curtain), wait until the main photo is decoded and tell the layer where to land.
 * On normal visits it does nothing, so back/forward scroll restoration stays intact.
 */
export function HouseReady() {
  useLayoutEffect(() => {
    if (!morph.get()) return
    // "instant": the site has CSS smooth scrolling, which would make this jump a visible slide (and the photo
    // slot would be measured mid-way, so the photo landed in the wrong place)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const img = document.querySelector<HTMLImageElement>('.house__photo img, .v2-hero__img img')
    const fire = () => {
      const r = img?.getBoundingClientRect()
      morph.land(r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null)
    }
    if (img && !img.complete) img.decode().then(fire, fire)
    else fire()
  }, [])
  return null
}
