'use client'

import dynamic from 'next/dynamic'
import { type ReactNode, useEffect, useRef, useState } from 'react'

const BuildHouse3D = dynamic(() => import('./BuildHouse3D'), { ssr: false })

/** What the 3D shows while a card is read: card i finishes stage i. */
const STAGES = ['Фундамент', 'Стены', 'Кровля', 'Окна и коммуникации', 'Двор и новоселье']
// 3D timeline (BUILD_STEPS in BuildHouse3D): the end of each stage
const ENDS = [0.16, 0.36, 0.52, 0.64, 0.8]
const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, Math.max(0, k))

export type TrustPoint = { big?: string; title: string; text: string }

/**
 * «Построить дом»: the 3D house is the background, over it a short run of reasons to trust us.
 * The house is built while they are read — one stage per reason — so a couple of screens of scrolling
 * and it stands finished. Without JS (or with reduced motion) the cards are plain text and the house is shown finished.
 */
export function BuildStory({ intro, points, end }: { intro: ReactNode; points: TrustPoint[]; end: ReactNode }) {
  const section = useRef<HTMLElement>(null)
  const cards = useRef<(HTMLElement | null)[]>([])
  const progress = useRef(0)
  const bar = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState(-1) // -1: the empty plot
  const [near, setNear] = useState(false)
  const [wide, setWide] = useState(true)
  const n = Math.min(points.length, STAGES.length)

  useEffect(() => {
    const el = section.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '400px 0px' })
    io.observe(el)
    const onScroll = () => {
      // the reading line: mid-screen on a desktop (text beside the house), low on a phone (text under the house)
      const h = window.innerHeight
      const phone = window.innerWidth < 900
      const line = h * (phone ? 0.74 : 0.55)
      // phone: the house is in the upper half — a card that has been read fades out on its way up instead of covering it
      el.querySelectorAll<HTMLElement>('.story__card').forEach((c) => {
        const bottom = c.getBoundingClientRect().bottom
        c.style.opacity = phone ? String(Math.min(1, Math.max(0, (bottom - h * 0.5) / (h * 0.15)))) : ''
      })
      const centers = cards.current.slice(0, n).map((c) => (c ? c.getBoundingClientRect().top + c.offsetHeight / 2 : Infinity))
      // fractional index of the card on the reading line; -1..0 while the first one is on its way
      let f = -Math.min(1, (centers[0] - line) / (h * 0.45))
      if (centers[0] <= line) {
        f = n - 1
        for (let j = 0; j < n - 1; j++) {
          if (centers[j + 1] > line) {
            f = j + (centers[j] - line) / (centers[j] - centers[j + 1])
            break
          }
        }
      }
      const j = Math.floor(f)
      const p = f < 0 ? lerp(0, ENDS[0], f + 1) : j >= n - 1 ? ENDS[n - 1] : lerp(ENDS[j], ENDS[j + 1], f - j)
      // past the last reason the house is finished (1 = camera settled)
      progress.current = el.getBoundingClientRect().bottom < h * 1.2 ? 1 : p
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, progress.current / ENDS[n - 1])})`
      // (a hair before the exact line counts: sub-pixel layout leaves f at 3.999)
      setStage(f <= -0.5 ? -1 : f >= n - 1.02 ? n : Math.max(0, Math.round(f)))
    }
    const onResize = () => {
      setWide(window.innerWidth >= 900)
      onScroll()
    }
    onResize()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [n])

  return (
    <section className="story" ref={section} id="build">
      <div className="story__bg" aria-hidden>
        {/* desktop: the house to the right of the text column; phone: above the cards */}
        {near && <BuildHouse3D progress={progress} shift={wide ? { x: 0.16, y: 0 } : { x: 0, y: 0.24 }} />}
        <div className="story__badge">
          <b>{stage < 0 ? 'Ваш участок' : stage >= n ? 'Дом готов' : `Этап ${stage + 1} из ${n}`}</b>
          <span>{stage < 0 ? 'Листайте — построим дом' : stage >= n ? 'Можно заезжать' : STAGES[stage]}</span>
        </div>
        <div className="story__progress">
          <div ref={bar} />
        </div>
      </div>

      <div className="story__flow container">
        <div className="story__card story__card--intro">{intro}</div>
        {points.slice(0, n).map((s, i) => (
          <article key={s.title} ref={(c) => void (cards.current[i] = c)} className={`story__card ${i === Math.min(stage, n - 1) ? 'is-on' : ''}`}>
            {s.big && <b className="story__big">{s.big}</b>}
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </article>
        ))}
        <div className="story__card story__card--end">{end}</div>
      </div>
    </section>
  )
}
