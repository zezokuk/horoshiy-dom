'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

const BuildHouse3D = dynamic(() => import('./BuildHouse3D'), { ssr: false })

const stagesFor = (projects: number) => [
  { title: 'Выбираете проект', text: `${projects} проверенных планировок — или адаптируем под вашу семью.` },
  { title: 'Фундамент', text: 'Основа дома — с неё начинается стройка на вашем участке.' },
  { title: 'Стены', text: 'Капитальная коробка из сертифицированных материалов.' },
  { title: 'Кровля', text: 'Крыша по проекту — такая же, как у построенных домов в посёлках.' },
  { title: 'Окна и коммуникации', text: 'Окна, газ, вода, электричество 15 кВт, септик, отопление.' },
  { title: 'Двор и ключи', text: 'Предчистовая отделка, двор и парковка на 2 машины — заезжайте.' },
]

/**
 * Sticky scroll section: the page scrolls through ~2 screens while the 3D house assembles on the right.
 * Stage list on the left highlights the current step. The list is rendered on the server, so it reads fine without JS.
 */
export function BuildSection({ projects, ctaHref = '#lead' }: { projects: number; ctaHref?: string }) {
  const STAGES = stagesFor(projects)
  const section = useRef<HTMLElement>(null)
  const progress = useRef(0)
  const [stage, setStage] = useState(0)
  const [near, setNear] = useState(false)
  const [started, setStarted] = useState(false) // the visitor has scrolled into the build — hide the «scroll» hint
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = section.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '400px 0px' })
    io.observe(el)
    const onScroll = () => {
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1
      progress.current = p
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, p / 0.8)})` // build is complete at 80% of the scroll
      setStarted(p > 0.05)
      // the list follows the 3D timeline (BUILD_STEPS in BuildHouse3D): foundation from 3%, walls from 16%,
      // roof from 36%, windows from 52%, yard from 64%, done at 80%
      const starts = [0.03, 0.16, 0.36, 0.52, 0.64]
      setStage(starts.filter((b) => p >= b).length)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section className="build3d" ref={section} id="build">
      <div className="build3d__sticky">
        <div className="container build3d__grid">
          <div className="build3d__text">
            <span className="idx">Построим ваш дом</span>
            <h2 className="title title--lg">Капитальный дом за 6 месяцев</h2>
            <ol className="build3d__stages">
              {STAGES.map((s, i) => (
                <li key={s.title} className={i === stage ? 'is-on' : i < stage ? 'is-done' : ''}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <b>{s.title}</b>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
            <p className="note">Примерный график — точные сроки фиксируем в договоре.</p>
            <div className="btns">
              <a href={ctaHref} className="btn btn--gold btn--sm">
                Рассчитать стройку на моём участке
              </a>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  const el = section.current
                  if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight - window.innerHeight * 0.6, behavior: 'smooth' })
                }}
              >
                Пропустить ↓
              </button>
            </div>
          </div>
          <div className="build3d__stage">
            {near && <BuildHouse3D progress={progress} />}
            <div className="build3d__badge">
              <b>
                Шаг {stage + 1} из {STAGES.length}
              </b>
              <span>{STAGES[stage].title}</span>
            </div>
            <div className={`build3d__hint ${started ? '' : 'is-on'}`} aria-hidden={started}>
              <span className="build3d__mouse" />
              Листайте вниз — дом построится у вас на глазах
            </div>
            <div className="build3d__progress" aria-hidden>
              <div ref={bar} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
