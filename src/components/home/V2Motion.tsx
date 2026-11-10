'use client'

import { useEffect } from 'react'
import { scroll } from 'motion'

/**
 * Motion of the home in the default v2 look (10.11, the era-residence.com reference pack):
 * - the big photos open with a diagonal curtain (`[data-reveal-photo]`): the frame's clip-path sweeps from the left
 *   edge on a constant slant while the picture inside settles from scale 1.35 with a small sideways drift;
 * - the covers and the film's photos sail against the scroll (`.v2-zoom[data-parallax]="N"` = ±N% of the frame's
 *   height; the wrapper is scaled just enough to hide the edges, --ps is derived from N);
 * - the founder's numbers count up when they come into view, one card after another (0.1 s stagger);
 * - the header's nav, the `.v2-link` arrows and the bridge lines roll their letters up on hover (fine pointers only).
 *
 * The look «dom» has its own grammar (DomMotion) and is left alone; with reduced motion or the admin's «no-motion»
 * none of this arms. Arming is the html.v2m class: every CSS rule of the pack hangs on it, so without the module
 * the page renders exactly as before. The film re-mounts its frames as it rolls, so a MutationObserver tops up
 * both the curtain and the drift for anything that enters the DOM later.
 */
export function V2Motion() {
  useEffect(() => {
    const root = document.documentElement
    if (root.getAttribute('data-v3') === 'dom') return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('no-motion')) return
    root.classList.add('v2m')
    const cleanups: (() => void)[] = []

    /* ---------- 1. the diagonal curtain ---------- */
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          io.unobserve(e.target)
          e.target.classList.add('is-in')
          // when the sweep has played, plain CSS is restored: the hover zoom gets its own ease back, the clip goes
          window.setTimeout(() => e.target.classList.add('is-done'), 1300)
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )

    /* ---------- 2. the drift against the scroll ---------- */
    const drifts = new Map<HTMLElement, () => void>()
    const bindDrift = (el: HTMLElement) => {
      if (drifts.has(el)) return
      const range = Number(el.dataset.parallax) || 15 // ±% of the frame's height
      // the picture must still cover the frame at both ends of the drift (+ a hair for rounding)
      el.style.setProperty('--ps', (1 + (2 * range) / 100 + 0.04).toFixed(3))
      drifts.set(
        el,
        scroll((p: number) => el.style.setProperty('--py', `${((p * 2 - 1) * range).toFixed(2)}%`), {
          target: el,
          offset: ['start end', 'end start'],
        }),
      )
    }
    const dropDrift = (el: HTMLElement) => {
      drifts.get(el)?.()
      drifts.delete(el)
    }

    const arm = (node: ParentNode) => {
      if (node instanceof HTMLElement) {
        if (node.matches('[data-reveal-photo]:not(.is-in)')) io.observe(node)
        if (node.matches('.v2-zoom[data-parallax]')) bindDrift(node)
      }
      node.querySelectorAll?.('[data-reveal-photo]:not(.is-in)').forEach((el) => io.observe(el as HTMLElement))
      node.querySelectorAll?.('.v2-zoom[data-parallax]').forEach((el) => bindDrift(el as HTMLElement))
    }
    const disarm = (node: ParentNode) => {
      if (node instanceof HTMLElement && node.matches('.v2-zoom[data-parallax]')) dropDrift(node)
      node.querySelectorAll?.('.v2-zoom[data-parallax]').forEach((el) => dropDrift(el as HTMLElement))
    }
    arm(document)
    const mo = new MutationObserver((recs) =>
      recs.forEach((r) => {
        r.addedNodes.forEach((n) => n.nodeType === 1 && arm(n as HTMLElement))
        r.removedNodes.forEach((n) => n.nodeType === 1 && disarm(n as HTMLElement))
      }),
    )
    mo.observe(document.body, { childList: true, subtree: true })
    cleanups.push(() => {
      io.disconnect()
      mo.disconnect()
      drifts.forEach((stop) => stop())
      drifts.clear()
    })

    /* ---------- 3. the founder's numbers count up ---------- */
    const dts = Array.from(document.querySelectorAll<HTMLElement>('#who .v2-facts dt'))
    const factsList = dts[0]?.closest('.v2-facts')
    if (dts.length && factsList) {
      const cio = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return
          cio.disconnect()
          dts.forEach((dt, i) => {
            const original = dt.textContent ?? ''
            const m = original.match(/^(\d+)([\s\S]*)$/)
            if (!m) return
            const to = Number(m[1])
            const suffix = m[2]
            const t0 = performance.now() + i * 100
            const tick = (now: number) => {
              const k = Math.min(1, Math.max(0, (now - t0) / 900))
              dt.textContent = k >= 1 ? original : `${Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString('ru-RU')}${suffix}`
              if (k < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          })
        },
        { threshold: 0.35 },
      )
      cio.observe(factsList)
      cleanups.push(() => cio.disconnect())
    }

    /* ---------- 5. the roll on hover: two copies of the label, the letters wave ±100% ---------- */
    const rolled = new Map<HTMLElement, string>()
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const rollify = (el: HTMLElement) => {
        const text = el.textContent ?? ''
        if (!text.trim() || rolled.has(el)) return
        const mkRow = (shadow: boolean) => {
          const row = document.createElement('span')
          row.className = shadow ? 'rl__row rl__row--b' : 'rl__row'
          if (shadow) row.setAttribute('aria-hidden', 'true')
          let i = 0
          for (const ch of text) {
            const s = document.createElement('span')
            s.className = 'rl__ch'
            s.style.setProperty('--i', String(ch === ' ' ? i : i++))
            s.textContent = ch === ' ' ? '\u00a0' : ch
            row.appendChild(s)
          }
          return row
        }
        rolled.set(el, text)
        el.textContent = ''
        el.classList.add('rl')
        el.append(mkRow(false), mkRow(true))
      }
      document.querySelectorAll<HTMLElement>('.nav a, .v2-link, .bridge__text').forEach(rollify)
      cleanups.push(() =>
        rolled.forEach((text, el) => {
          el.textContent = text
          el.classList.remove('rl')
        }),
      )
    }

    return () => {
      root.classList.remove('v2m')
      cleanups.forEach((c) => c())
    }
  }, [])
  return null
}
