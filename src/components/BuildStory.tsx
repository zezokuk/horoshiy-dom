'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

const BuildHouse3D = dynamic(() => import('./BuildHouse3D'), { ssr: false })

const stagesFor = (projects: number) => [
  { title: 'Выбираете проект', text: `${projects} проверенных планировок — или адаптируем проект под вашу семью. Считаем смету и сроки, фиксируем в договоре.` },
  { title: 'Фундамент', text: 'Основа дома — с неё начинается стройка на вашем участке.' },
  { title: 'Стены', text: 'Капитальная кирпичная коробка из сертифицированных материалов.' },
  { title: 'Кровля', text: 'Крыша по проекту — такая же, как у построенных домов в наших посёлках.' },
  { title: 'Окна и коммуникации', text: 'Окна, газ, вода, электричество 15 кВт, септик, отопление.' },
  { title: 'Двор и ключи', text: 'Предчистовая отделка, двор и парковка на 2 машины — заезжайте. Гарантия на дом 5 лет.' },
]

// 3D timeline (BUILD_STEPS in BuildHouse3D): the end of each stage. Card j in the middle of the screen = stage j built.
const ENDS = [0.03, 0.16, 0.36, 0.52, 0.64, 0.8]
const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, Math.max(0, k))

/**
 * «Построить дом»: the 3D house is the background of the whole screen, the stages are text cards scrolling over it.
 * The build follows the reading: as a card comes to the middle of the screen, its stage assembles behind it.
 * Without JS (or with reduced motion) the cards are plain readable text and the house is shown finished.
 */
export function BuildStory({ projects, ctaHref = '#calc' }: { projects: number; ctaHref?: string }) {
  const STAGES = stagesFor(projects)
  const section = useRef<HTMLElement>(null)
  const cards = useRef<(HTMLElement | null)[]>([])
  const progress = useRef(0)
  const bar = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState(-1) // -1: the intro card
  const [near, setNear] = useState(false)
  const [wide, setWide] = useState(true)

  useEffect(() => {
    const el = section.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '400px 0px' })
    io.observe(el)
    const onScroll = () => {
      // the reading line: mid-screen on a desktop (text beside the house), low on a phone (text under the house)
      const mid = window.innerHeight * (window.innerWidth >= 900 ? 0.55 : 0.74)
      const centers = cards.current.map((c) => (c ? c.getBoundingClientRect().top + c.offsetHeight / 2 : Infinity))
      // fractional index of the card at the middle of the screen: -1 = before the first stage card
      let f = -1
      if (centers[0] <= mid) {
        f = centers.length - 1
        for (let j = 0; j < centers.length - 1; j++) {
          if (centers[j + 1] > mid) {
            f = j + (centers[j] - mid) / (centers[j] - centers[j + 1])
            break
          }
        }
      } else {
        const intro = window.innerHeight // the first card starts one screen below the top of the section
        f = -Math.min(1, (centers[0] - mid) / intro)
      }
      const j = Math.floor(f)
      const p = f < 0 ? lerp(0, ENDS[0], f + 1) : j >= ENDS.length - 1 ? ENDS[ENDS.length - 1] : lerp(ENDS[j], ENDS[j + 1], f - j)
      // after the last card the house is finished (1 = camera settled)
      progress.current = el.getBoundingClientRect().bottom < window.innerHeight * 1.2 ? 1 : p
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, progress.current / 0.8)})`
      setStage(f < -0.5 ? -1 : Math.min(STAGES.length - 1, Math.max(0, Math.round(f))))
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
  }, [STAGES.length])

  return (
    <section className="story" ref={section} id="build">
      <div className="story__bg" aria-hidden>
        {/* desktop: the house to the right of the text column; phone: above the cards */}
        {near && <BuildHouse3D progress={progress} shift={wide ? { x: 0.2, y: 0 } : { x: 0, y: 0.24 }} />}
        <div className="story__badge">
          <b>{stage < 0 ? 'Ваш участок' : `Шаг ${stage + 1} из ${STAGES.length}`}</b>
          <span>{stage < 0 ? 'Листайте — построим дом' : STAGES[stage].title}</span>
        </div>
        <div className="story__progress">
          <div ref={bar} />
        </div>
      </div>

      <div className="story__flow container">
        <div className="story__card story__card--intro">
          <span className="idx">Построим ваш дом</span>
          <h2 className="title title--lg">Капитальный дом за 6 месяцев</h2>
          <p>Листайте вниз — дом построится у вас на глазах, этап за этапом.</p>
          <span className="build3d__mouse" aria-hidden />
        </div>
        {STAGES.map((s, i) => (
          <article key={s.title} ref={(n) => void (cards.current[i] = n)} className={`story__card ${i === stage ? 'is-on' : ''}`}>
            <span className="story__num">{String(i + 1).padStart(2, '0')}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </article>
        ))}
        <div className="story__card story__card--end">
          <h3>Готово — заезжайте</h3>
          <p className="note">Примерный график — точные сроки фиксируем в договоре.</p>
          <a href={ctaHref} className="btn btn--gold">
            Рассчитать стройку на моём участке
          </a>
        </div>
      </div>
    </section>
  )
}
