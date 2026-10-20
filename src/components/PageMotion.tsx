'use client'
import { useEffect } from 'react'

/**
 * Motion between and on pages (reference «Bikeville», 20.10), one listener each, for the whole site:
 * - page to page: the browser's cross-document view transition (CSS @view-transition in design.css). The card the user
 *   clicked gets the name «house-photo» just before leaving, and the house or project page names its main photo the same,
 *   so the photo flies from the card into its place. Named on click only: two cards with one name would cancel it.
 * - on a computer with a mouse: cards lean a little towards the pointer; «Заказать звонок» (.magnet, the only moving
 *   button) is pulled to it from a little way off and follows it as it tries to leave.
 * Phones and reduced motion: only the plain page fade (or nothing).
 */
export function PageMotion() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
      const card = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.house-card')
      const img = card?.querySelector<HTMLImageElement>('img')
      if (!card || !img) return
      document.querySelectorAll<HTMLElement>('[data-vt-named]').forEach((el) => {
        el.style.viewTransitionName = ''
        delete el.dataset.vtNamed
      })
      img.style.viewTransitionName = 'house-photo'
      img.dataset.vtNamed = ''
    }
    // back from the house page: the old card keeps its name in the bfcache copy, drop it
    const onShow = () =>
      document.querySelectorAll<HTMLElement>('[data-vt-named]').forEach((el) => {
        el.style.viewTransitionName = ''
        delete el.dataset.vtNamed
      })
    addEventListener('click', onClick)
    addEventListener('pageshow', onShow)

    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || still) {
      return () => {
        removeEventListener('click', onClick)
        removeEventListener('pageshow', onShow)
      }
    }

    let tilted: HTMLElement | null = null
    const pulled = new Map<HTMLElement, readonly [number, number]>()
    const REACH = 56
    let raf = 0
    let last: PointerEvent | null = null
    const frame = () => {
      raf = 0
      const e = last
      if (!e) return
      const t = e.target as HTMLElement
      const card = t.closest<HTMLElement>('.house-card, .way, .estate-card')
      if (tilted && tilted !== card) {
        tilted.style.removeProperty('--rx')
        tilted.style.removeProperty('--ry')
      }
      tilted = card
      if (card) {
        const r = card.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        card.style.setProperty('--rx', `${(-py * 4).toFixed(2)}deg`)
        card.style.setProperty('--ry', `${(px * 5).toFixed(2)}deg`)
      }
      // the «Vintara» first screen: house and title shift a little against each other (design.css → .hv)
      const hero = t.closest<HTMLElement>('.hv .hd__wrap')
      if (hero) {
        const r = hero.getBoundingClientRect()
        hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
        hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
      }
      // magnets: measured without their own pull (the rect moves with it), caught from REACH px around the edge
      document.querySelectorAll<HTMLElement>('.magnet').forEach((m) => {
        const [ox, oy] = pulled.get(m) ?? [0, 0]
        const r = m.getBoundingClientRect()
        const dx = e.clientX - (r.left - ox + r.width / 2)
        const dy = e.clientY - (r.top - oy + r.height / 2)
        if (Math.abs(dx) < r.width / 2 + REACH && Math.abs(dy) < r.height / 2 + REACH) {
          const k = [dx * 0.3, dy * 0.4] as const
          pulled.set(m, k)
          m.style.setProperty('--mx', `${k[0].toFixed(1)}px`)
          m.style.setProperty('--my', `${k[1].toFixed(1)}px`)
        } else if (pulled.delete(m)) {
          m.style.removeProperty('--mx')
          m.style.removeProperty('--my')
        }
      })
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      last = e
      if (!raf) raf = requestAnimationFrame(frame)
    }
    addEventListener('pointermove', onMove, { passive: true })
    return () => {
      removeEventListener('click', onClick)
      removeEventListener('pageshow', onShow)
      removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])
  return null
}
