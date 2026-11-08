'use client'

import { useEffect } from 'react'
import { animate as animeAnimate, splitText, stagger } from 'animejs'
import { inView, scroll } from 'motion'

/**
 * Motion of the look «dom» below the first screen (night 09→10.11, the six Refero picks: The1, bella, Samara).
 * - the block headings rise line by line from under a cut as they come into view (animejs splitText, lines clipped);
 * - photos drift a little slower than the page (motion scroll): `[data-parallax]` moves its --py from -N to N px.
 * Only under html[data-v3="dom"] and never with «reduce motion»; the v2 look and the server markup stay as they are.
 */
export function DomMotion() {
  useEffect(() => {
    const root = document.documentElement
    if (root.getAttribute('data-v3') !== 'dom') return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('no-motion')) return
    const cleanups: (() => void)[] = []

    // headings line by line: split once fonts are ready (Unbounded is wide, lines change when it arrives)
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled) return
      document.querySelectorAll<HTMLElement>('.home-step .v2-head .title, .home-step .v2-founder__text .title, .home-step .v2-build__text .title, .evf__title').forEach((el) => {
        const split = splitText(el, { lines: { wrap: 'clip' } })
        const lines = split.lines as HTMLElement[]
        lines.forEach((l) => (l.style.transform = 'translateY(105%)'))
        el.classList.add('dm-split')
        const stop = inView(
          el,
          () => {
            animeAnimate(lines, {
              translateY: ['105%', '0%'],
              duration: 900,
              delay: stagger(90),
              ease: 'outExpo',
              // back to plain text once shown: a resize re-flows it like any heading, screen readers get the original
              onComplete: () => {
                split.revert()
                el.classList.remove('dm-split')
              },
            })
          },
          { amount: 0.3 },
        )
        cleanups.push(() => {
          stop()
          split.revert()
          el.classList.remove('dm-split')
        })
      })
    })
    cleanups.push(() => (cancelled = true))

    // photos: a slow drift against the page, the box stays where it is (the picture is a touch larger than its frame)
    document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
      const range = Number(el.dataset.parallax) || 24
      cleanups.push(
        scroll((p: number) => el.style.setProperty('--py', `${(p * 2 - 1) * range}px`), {
          target: el,
          offset: ['start end', 'end start'],
        }),
      )
    })

    return () => cleanups.forEach((c) => c())
  }, [])
  return null
}
