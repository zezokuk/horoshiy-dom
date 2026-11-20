'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { goal } from '@/components/Metrika'
import { Pic } from '@/components/Pic'
import { FOUNDERS } from '@/v4/founders'
import { TYPE5_DOOR, createHouseScene } from '@/v4/threeModel'

export type StoryFact = { v: string; l: string }

export type WalkStop = {
  code: string
  tab: string
  title: string
  area?: string
  text: string
  src: string
  phone?: string
  alt: string
}

const NAME = 'ХОРОШИЙ ДОМ'

const ADVANTAGES = [
  { t: 'Сертифицированные материалы', d: 'Кирпич, кровля и инженерия — только с документами. Никаких «аналогов подешевле».' },
  { t: 'Продуманные проекты', d: '12 типовых проектов, в которых каждый метр работает: кухни-гостиные, мастер-спальни, террасы.' },
  { t: 'Гарантия 5 лет', d: 'Официальная гарантия на капитальные дефекты дома и сопровождение после ключей.' },
  { t: 'С 2014 года', d: 'Начинали с одного таунхауса, сегодня строим свои посёлки в Динской и Адыгее.' },
]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / Math.max(0.0001, b - a))
  return t * t * (3 - 2 * t)
}
const band = (x: number, in0: number, in1: number, out0: number, out1: number) =>
  Math.min(smooth(in0, in1, x), 1 - smooth(out0, out1, x))

/**
 * Единая бесшовная сцена Главной (Экраны 1 → 2 → 3 в одном sticky-контейнере):
 * 1) p = 0.00: Ночь → яркая падающая звезда → зажигаются тёплые огни в окнах и у крыльца → рассвет.
 * 2) p = 0.01..0.135: Тёплая радиальная дымка растворяет пейзаж вокруг дома — дом остаётся на месте уже как
 *    студийная 3D-модель с RoomEnvironment и живым mouse-parallax (откликается на движение курсора).
 * 3) p = 0.10..0.31: «О нас» — каскадное (stagger) появление 4 карточек преимуществ слева и 5 цифр справа.
 * 4) p = 0.30..0.46: «Наша команда» — каскадный выход 4 учредителей + «приглашаем вас в гости ↓».
 * 5) p = 0.42..0.525: Дом выравнивается фасадом, камера плавно въезжает ТОЧНО В ВХОДНУЮ ДВЕРЬ (X=1.50, Y=1.48, Z=5.26).
 * 6) p = 0.49..1.00: Размеренная, шёлковая пролётка внутри дома (~250vh хода) и мягкий выход в тёплый каталог типов.
 */
export function HouseStory3D({
  facts,
  walkStops,
  walkVideo,
  phone,
  tel,
  priceFrom,
  nightSrc,
  nightPhone,
}: {
  facts: StoryFact[]
  walkStops: WalkStop[]
  walkVideo?: { src: string; phone?: string; poster?: string; duration: number; at: readonly number[] }
  phone?: string
  tel?: string
  priceFrom?: string
  nightSrc?: string
  nightPhone?: string
}) {
  const wrapRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const heroLayerRef = useRef<HTMLDivElement>(null)
  const nightLayerRef = useRef<HTMLDivElement>(null)
  const heroCopyRef = useRef<HTMLDivElement>(null)
  const vignetteRef = useRef<HTMLDivElement>(null)
  const aboutLayerRef = useRef<HTMLDivElement>(null)
  const teamLayerRef = useRef<HTMLDivElement>(null)
  const inviteRef = useRef<HTMLDivElement>(null)
  const walkLayerRef = useRef<HTMLDivElement>(null)
  const walkExitRef = useRef<HTMLDivElement>(null)
  const footHintRef = useRef<HTMLSpanElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const advRefs = useRef<(HTMLDivElement | null)[]>([])
  const statRefs = useRef<(HTMLDivElement | null)[]>([])
  const founderRefs = useRef<(HTMLElement | null)[]>([])
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const cardRefs = useRef<(HTMLLIElement | null)[]>([])
  const barRefs = useRef<(HTMLElement | null)[]>([])

  const [fallback, setFallback] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [isDay, setIsDay] = useState(false)

  // Фиксация шапки после первого экрана — работает всегда (включая prefers-reduced-motion)
  useEffect(() => {
    const syncBar = () => {
      document.documentElement.classList.toggle('past-hero', window.scrollY > window.innerHeight * 0.35)
    }
    syncBar()
    window.addEventListener('scroll', syncBar, { passive: true })
    window.addEventListener('resize', syncBar, { passive: true })
    return () => {
      window.removeEventListener('scroll', syncBar)
      window.removeEventListener('resize', syncBar)
      document.documentElement.classList.remove('past-hero')
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('no-motion')
    if (reduced) {
      setFallback(true)
      setIsDay(true)
      return
    }
    const host = canvasRef.current
    const wrap = wrapRef.current
    if (!host || !wrap) return

    const wide = window.matchMedia('(min-width: 861px)').matches
    const fine = window.matchMedia('(pointer: fine)').matches
    if (videoRef.current && walkVideo) {
      videoRef.current.src = wide ? walkVideo.src : (walkVideo.phone ?? walkVideo.src)
    }

    let targetP = 0
    let curP = -1
    let shownVidTime = -1
    let autoDawn = 0
    let raf = 0
    let autoRaf = 0
    let inView = true
    let dayFlag = false
    let sent3d = false
    let sentWalk = false

    // Живой mouse-parallax для 3D-дома (приём Marvis canvasHero)
    let targetMx = 0
    let targetMy = 0
    let curMx = 0
    let curMy = 0

    const onPointerMove = (e: PointerEvent) => {
      if (!fine || !inView) return
      targetMx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2
      targetMy = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2
    }

    const updateTarget = () => {
      const r = wrap.getBoundingClientRect()
      const run = Math.max(1, r.height - window.innerHeight)
      targetP = clamp01(-r.top / run)
      root.classList.toggle('past-hero', window.scrollY > window.innerHeight * 0.35 || targetP > 0.06)
    }

    // Падает звезда (0.5..2.3с), зажигаются тёплые окна (1.7с), затем мягкий рассвет (3.6..6.4с)
    const dawnTimer = window.setTimeout(() => {
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 2800)
        autoDawn = k * k * (3 - 2 * k)
        if (!dayFlag && autoDawn > 0.45) {
          dayFlag = true
          setIsDay(true)
        }
        if (nightLayerRef.current) {
          const dawnP = Math.max(autoDawn, clamp01(targetP / 0.06))
          nightLayerRef.current.style.opacity = String(1 - dawnP)
        }
        if (k < 1) autoRaf = requestAnimationFrame(step)
      }
      autoRaf = requestAnimationFrame(step)
    }, 3600)

    const { handles, dispose } = createHouseScene(host, {
      studioFog: true,
      onLoaded: () => {
        setLoaded(true)
        curP = -1
      },
      onError: () => setFallback(true),
    })
    if (!handles) {
      clearTimeout(dawnTimer)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true
      },
      { threshold: 0 },
    )
    io.observe(wrap)

    const lookAt = new THREE.Vector3(0, 2.5, 0)
    let lastFrameT = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!inView) {
        lastFrameT = now
        return
      }

      const dt = Math.min(0.05, Math.max(0.004, (now - lastFrameT) / 1000))
      lastFrameT = now

      const speed = curP > 0.48 ? 4.4 : 6.2
      const alpha = 1 - Math.exp(-speed * dt)
      const nextP = curP < 0 ? targetP : curP + (targetP - curP) * alpha
      const diffP = Math.abs(targetP - nextP)

      const mAlpha = 1 - Math.exp(-5.0 * dt)
      curMx += (targetMx - curMx) * mAlpha
      curMy += (targetMy - curMy) * mAlpha
      const diffM = Math.abs(targetMx - curMx) + Math.abs(targetMy - curMy)

      const changedP = curP < 0 || diffP > 0.00025
      const changed3d = changedP || (curP > 0.06 && curP < 0.56 && diffM > 0.002)
      curP = diffP < 0.00025 ? targetP : nextP

      const dawnP = Math.max(autoDawn, clamp01(curP / 0.055))
      if (!dayFlag && dawnP > 0.45) {
        dayFlag = true
        setIsDay(true)
      }
      if (nightLayerRef.current) {
        nightLayerRef.current.style.opacity = (1 - dawnP).toFixed(3)
      }

      const walkOp = smooth(0.49, 0.535, curP)
      const wp = clamp01((curP - 0.52) / 0.44)
      const vid = videoRef.current
      const hasVid = Boolean(vid && walkVideo && vid.readyState >= 1)
      const terraceStart = 0.76
      const targetVidTime = hasVid && walkVideo ? clamp01(wp / terraceStart) * Math.max(0.1, walkVideo.duration - 0.08) : -1
      const vidCatchup = hasVid && walkOp > 0.01 && targetVidTime >= 0 && (shownVidTime < 0 || Math.abs(targetVidTime - shownVidTime) > 0.015)

      if (!changedP && !changed3d && !vidCatchup) return

      // Цели UX-воронки в Яндекс.Метрику (HEART / Engagement)
      if (!sent3d && curP > 0.14) {
        sent3d = true
        goal('v4_3d_about')
      }
      if (!sentWalk && curP > 0.58) {
        sentWalk = true
        goal('v4_walk_view')
      }

      if (changedP) {
        // 1 -> 2: Кинематографичный переход в 3D (тёплая радиальная дымка растворяет пейзаж вокруг дома)
        const morphP = smooth(0.01, 0.135, curP)
        const heroFade = 1 - smooth(0.045, 0.14, curP)
        if (heroLayerRef.current) {
          heroLayerRef.current.style.opacity = heroFade.toFixed(3)
          heroLayerRef.current.style.transform = `scale(${(1 + morphP * 0.035).toFixed(4)})`
          heroLayerRef.current.style.pointerEvents = heroFade > 0.25 ? 'auto' : 'none'
        }
        if (vignetteRef.current) {
          const ring = smooth(0.005, 0.11, curP)
          vignetteRef.current.style.opacity = ring.toFixed(3)
          const inner = Math.round(62 - ring * 34)
          const outer = Math.round(95 - ring * 38)
          vignetteRef.current.style.background = `radial-gradient(ellipse at 50% 64%, rgba(235,227,214,0) ${inner}%, rgba(235,227,214,0.96) ${outer}%, #ebe3d6 100%)`
        }
        if (heroCopyRef.current) {
          const copyFade = 1 - smooth(0.0, 0.075, curP)
          heroCopyRef.current.style.opacity = copyFade.toFixed(3)
          heroCopyRef.current.style.transform = `translate3d(0, ${(-smooth(0.0, 0.09, curP) * 34).toFixed(1)}px, 0)`
        }

        // Фаза 2А: О нас + каскадный (stagger) выход карточек и цифр
        const aboutOp = band(curP, 0.10, 0.155, 0.26, 0.315)
        if (aboutLayerRef.current) {
          aboutLayerRef.current.style.opacity = aboutOp.toFixed(3)
          aboutLayerRef.current.style.pointerEvents = aboutOp > 0.25 ? 'auto' : 'none'
        }
        if (aboutOp > 0.01) {
          advRefs.current.forEach((card, k) => {
            if (!card) return
            const s = smooth(0.11 + k * 0.011, 0.165 + k * 0.011, curP)
            card.style.opacity = s.toFixed(3)
            card.style.transform = `translate3d(${((1 - s) * -18).toFixed(1)}px, 0, 0)`
          })
          statRefs.current.forEach((st, k) => {
            if (!st) return
            const s = smooth(0.12 + k * 0.01, 0.175 + k * 0.01, curP)
            st.style.opacity = s.toFixed(3)
            st.style.transform = `translate3d(${((1 - s) * 18).toFixed(1)}px, 0, 0)`
          })
        }

        // Фаза 2Б: Наша команда + каскадный выход 4 учредителей
        const teamOp = band(curP, 0.305, 0.35, 0.415, 0.46)
        if (teamLayerRef.current) {
          teamLayerRef.current.style.opacity = teamOp.toFixed(3)
          teamLayerRef.current.style.pointerEvents = teamOp > 0.25 ? 'auto' : 'none'
        }
        if (teamOp > 0.01) {
          founderRefs.current.forEach((fc, k) => {
            if (!fc) return
            const s = smooth(0.305 + k * 0.006, 0.34 + k * 0.006, curP)
            fc.style.opacity = s.toFixed(3)
            fc.style.transform = `translate3d(0, ${((1 - s) * 20).toFixed(1)}px, 0)`
          })
        }
        if (inviteRef.current) {
          const invOp = band(curP, 0.34, 0.385, 0.455, 0.495)
          inviteRef.current.style.opacity = invOp.toFixed(3)
        }
      }

      // 3D-рендер с живым mouse-parallax и точным въездом в входную дверь
      if (changed3d && curP < 0.56) {
        const settle2 = smooth(0.015, 0.14, curP)
        const turnRight = band(curP, 0.11, 0.19, 0.25, 0.32)
        const turnLeft = band(curP, 0.30, 0.365, 0.41, 0.46)
        const doorAlign = smooth(0.425, 0.485, curP)
        const doorEnter = smooth(0.445, 0.525, curP)
        const mouseWeight = (1 - doorAlign) * smooth(0.06, 0.14, curP)

        const yaw = (turnRight * 0.52 - turnLeft * 0.36) * (1 - doorAlign) + curMx * 0.075 * mouseWeight
        handles.pivot.rotation.y = yaw

        const baseDist = 26.2 + settle2 * 1.4 - turnRight * 0.4 + turnLeft * 0.5
        const camZ = baseDist * (1 - doorEnter) + (TYPE5_DOOR.z + 0.34) * doorEnter
        const orbitX = (turnRight * 1.1 - turnLeft * 0.9) * (1 - doorAlign) + curMx * 0.55 * mouseWeight
        const camX = orbitX + TYPE5_DOOR.x * doorAlign
        const baseY = 2.65 + settle2 * 0.95 + turnRight * 0.35 - curMy * 0.35 * mouseWeight
        const camY = baseY * (1 - doorAlign) + (TYPE5_DOOR.y + 0.04) * doorAlign

        const lookX = TYPE5_DOOR.x * doorAlign
        const lookY = (2.85 - settle2 * 0.45) * (1 - doorAlign) + TYPE5_DOOR.y * doorAlign
        const lookZ = (TYPE5_DOOR.z - 0.8) * doorEnter

        handles.camera.position.set(camX, camY, camZ)
        lookAt.set(lookX, lookY, lookZ)
        handles.camera.lookAt(lookAt)
        handles.renderer.render(handles.scene, handles.camera)
      }

      // Подсказка про мышь видна ТОЛЬКО на этапе 3D-дома (никакого дубляжа «3D тур» поверх ночного кадра и пролётки)
      if (changedP && footHintRef.current) {
        footHintRef.current.style.opacity = band(curP, 0.12, 0.17, 0.43, 0.49).toFixed(3)
      }

      // Плавная интерполяция видео на пролётке
      if (walkOp > 0.01 && hasVid && vid && targetVidTime >= 0) {
        const vidAlpha = 1 - Math.exp(-7.5 * dt)
        shownVidTime = shownVidTime < 0 ? targetVidTime : shownVidTime + (targetVidTime - shownVidTime) * vidAlpha
        if (!vid.seeking && Math.abs(vid.currentTime - shownVidTime) > 0.035) {
          vid.currentTime = shownVidTime
        }
      }

      // Фаза 3: Вход в дверь → сразу «про нас» и размеренная пролётка + мягкий выход в тёплый каталог типов
      if (changedP) {
        if (walkLayerRef.current) {
          walkLayerRef.current.style.opacity = walkOp.toFixed(3)
          walkLayerRef.current.style.pointerEvents = walkOp > 0.25 ? 'auto' : 'none'
        }

        if (walkOp > 0.01) {
          const n = Math.max(1, walkStops.length)

          if (vid && walkVideo) {
            const vOp = wp < terraceStart ? 1 : 1 - smooth(terraceStart, terraceStart + 0.08, wp)
            vid.style.opacity = hasVid ? vOp.toFixed(3) : '0'
          }

          slideRefs.current.forEach((sl, idx) => {
            if (!sl) return
            const segStart = idx / n
            const segEnd = (idx + 1) / n
            const localP = clamp01((wp - segStart) / Math.max(0.001, segEnd - segStart))
            let op = 0
            if (idx === 0) op = wp < segEnd ? 1 : 1 - smooth(segEnd - 0.07, segEnd + 0.05, wp)
            else if (idx === n - 1) op = smooth(segStart - 0.06, segStart + 0.06, wp)
            else op = band(wp, segStart - 0.06, segStart + 0.05, segEnd - 0.06, segEnd + 0.05)
            sl.style.opacity = op.toFixed(3)
            const imgEl = sl.querySelector('img')
            if (imgEl) {
              const sc = 1 + localP * 0.1
              imgEl.style.transform = `scale(${sc.toFixed(3)})`
            }
          })

          cardRefs.current.forEach((card, idx) => {
            if (!card) return
            const segStart = idx / n
            const segEnd = (idx + 1) / n
            const isLast = idx === n - 1
            const op = isLast
              ? smooth(segStart - 0.03, segStart + 0.06, wp)
              : band(wp, idx === 0 ? -0.05 : segStart - 0.03, idx === 0 ? 0.03 : segStart + 0.05, segEnd - 0.06, segEnd + 0.03)
            card.style.opacity = op.toFixed(3)
            card.style.visibility = op > 0.02 ? 'visible' : 'hidden'
            card.style.transform = `translate3d(0, ${((1 - op) * 14).toFixed(1)}px, 0)`
          })

          barRefs.current.forEach((bar, idx) => {
            if (!bar) return
            const segStart = idx / n
            const segEnd = (idx + 1) / n
            const fill = clamp01((wp - segStart) / Math.max(0.001, segEnd - segStart))
            bar.style.transform = `scaleX(${fill.toFixed(3)})`
          })

          // Мягкая тёплая вуаль на самом выходе (p = 0.955..1.00) к секции «Типы домов»
          if (walkExitRef.current) {
            const exitOp = smooth(0.955, 1.0, curP) * 0.94
            walkExitRef.current.style.opacity = exitOp.toFixed(3)
          }
        }
      }
    }

    updateTarget()
    tick(performance.now())
    window.addEventListener('scroll', updateTarget, { passive: true })
    window.addEventListener('resize', updateTarget)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      clearTimeout(dawnTimer)
      cancelAnimationFrame(raf)
      cancelAnimationFrame(autoRaf)
      io.disconnect()
      window.removeEventListener('scroll', updateTarget)
      window.removeEventListener('resize', updateTarget)
      window.removeEventListener('pointermove', onPointerMove)
      dispose()
    }
  }, [walkStops.length, walkVideo])

  return (
    <section
      ref={wrapRef}
      className={`v4-story3d hn${isDay ? ' is-day' : ''}${fallback ? ' v4-story3d--fallback' : ''}`}
      id="top"
      aria-label="Хороший дом — знакомство с компанией, 3D-домом и прогулкой внутри"
    >
      <span id="o-nas-3d" className="v4-story3d__anchor" />
      <span id="vnutri" className="v4-story3d__anchor-walk" />
      <span id="zachem" className="v4-story3d__anchor-walk" />

      <div className="v4-story3d__pin">
        <div className="v4-story3d__bg" aria-hidden />

        <div ref={canvasRef} className="v4-story3d__canvas" />
        {(!loaded || fallback) && (
          <div className="v4-story3d__loader">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/v4/img/type5-day.webp" alt="3D-модель дома «Тип 5»" />
          </div>
        )}

        {/* Слой 1: Первый экран (Ночь → яркая звезда → тёплые окна → утро → мягкая белая дымка в 3D) */}
        <div ref={heroLayerRef} className="v4-story3d__hero">
          <div className="v4-story3d__day">
            <Pic src="/design/hero-morning.webp" phone="/design/hero-morning-phone.webp" alt="Кирпичный дом «Тип 5» утром" priority />
          </div>
          <div ref={nightLayerRef} className={`hn__night${nightSrc ? '' : ' hn__night--css'}`} aria-hidden>
            <Pic src={nightSrc ?? '/design/hero-morning.webp'} phone={nightPhone ?? (nightSrc ? undefined : '/design/hero-morning-phone.webp')} alt="" />
            <i className="hn__windows v4-hero__lights" />
            <i className="hn__stars" />
            <i className="hn__star" />
          </div>
          <i className="hn__scrim" aria-hidden />
          <div ref={vignetteRef} className="v4-story3d__vignette" aria-hidden />

          <div ref={heroCopyRef} className="v4-story3d__hero-ui">
            <div className="v3-wrap v4-hero__top">
              <a href="#top" className="v4-hero__logo" aria-label="Хороший дом">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/v3/logo-white.svg" alt="" width={118} height={55} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/v3/logo.svg" alt="" width={118} height={55} />
              </a>
              <div className="v3-row">
                {tel && phone && <a className="v4-hero__tel" href={`tel:${tel}`}>{phone}</a>}
                <a className="v3-btn v3-btn--glass v4-hero__btn" href="#karta">Выбрать дом</a>
              </div>
            </div>
            <div className="v4-hero__title">
              <p className="v3-hero2__name" aria-label="Хороший дом">
                {[...NAME].map((ch, k) => (
                  <span key={k} aria-hidden style={{ '--i': k } as CSSProperties}>
                    {ch === ' ' ? '\u00A0' : ch}
                  </span>
                ))}
              </p>
              <h1 className="v4-hero__h1 v3-sr">
                Готовые кирпичные дома с участком под Краснодаром{priceFrom ? <> · <b>от {priceFrom}</b></> : null}
              </h1>
            </div>
          </div>
        </div>

        {/* Слой 2А: О нас + факты вокруг живой студийной 3D-модели */}
        <div ref={aboutLayerRef} className="v4-story3d__layer" style={{ opacity: fallback ? 1 : 0, pointerEvents: fallback ? 'auto' : 'none' }}>
          <div className="v3-wrap v4-story3d__about">
            <div className="v4-story3d__col-l">
              <div className="v4-story3d__title-box">
                <p className="v4-num"><b>01</b> / Кто строит</p>
                <h2 className="v4-story3d__h2">Дом, за который <em>отвечаем лично</em></h2>
              </div>
              <div className="v4-story3d__glass-list">
                {ADVANTAGES.map((a, idx) => (
                  <div key={a.t} ref={(el) => { advRefs.current[idx] = el }} className="v4-story-card">
                    <b>{a.t}</b>
                    <p>{a.d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="v4-story3d__col-r">
              {facts.map((f, idx) => (
                <div key={f.l} ref={(el) => { statRefs.current[idx] = el }} className="v4-story-stat">
                  <b>{f.v}</b>
                  <span>{f.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Слой 2Б: Наша команда — 4 учредителя + «приглашаем вас в гости» */}
        <div ref={teamLayerRef} className="v4-story3d__layer v4-story3d__layer--team" style={{ opacity: fallback ? 1 : 0, pointerEvents: fallback ? 'auto' : 'none' }}>
          <div className="v3-wrap v4-story3d__team">
            <div className="v4-story3d__team-head">
              <p className="v4-num"><b>02</b> / Команда</p>
              <h2 className="v4-story3d__h2">Наша <em>команда</em></h2>
              <p className="v4-story3d__team-sub">
                Мы сами выбираем участки, проверяем кирпич и ходим по стройке. Поэтому не прячемся за вывесками — приглашаем вас прямо за порог.
              </p>
            </div>
            <div className="v4-founders v4-founders--compact">
              {FOUNDERS.map((f, idx) => (
                <article key={f.id} ref={(el) => { founderRefs.current[idx] = el }} className="v4-founder-card">
                  <div className="v4-founder-card__ava" aria-hidden>{f.initials}</div>
                  <div>
                    <h3>{f.name}</h3>
                    <p className="v4-founder-card__role">{f.role}</p>
                    <p className="v4-founder-card__q">«{f.quote}»</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div ref={inviteRef} className="v4-story3d__invite" style={{ opacity: 0 }} aria-hidden>
          <em>приглашаем вас в гости</em>
          <span>↓</span>
        </div>

        {/* Слой 3: Сразу при въезде в дверь — «про нас» и плавная пролётка внутри дома */}
        <div ref={walkLayerRef} className="v4-story3d__walk" style={{ opacity: fallback ? 1 : 0, pointerEvents: fallback ? 'auto' : 'none' }}>
          <div className="v4-story3d__walk-media">
            {walkStops.map((s, idx) => (
              <div
                key={s.code}
                ref={(el) => { slideRefs.current[idx] = el }}
                className="v4-story3d__walk-slide"
                style={{ opacity: idx === 0 ? 1 : 0, zIndex: idx + 1 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.alt} loading={idx === 0 ? 'eager' : 'lazy'} />
              </div>
            ))}
            {walkVideo && (
              <video
                ref={videoRef}
                className="v4-story3d__walk-video"
                muted
                playsInline
                preload="auto"
                poster={walkVideo.poster}
                aria-hidden="true"
              />
            )}
            <i className="v4-grow__scrim" aria-hidden />
          </div>

          <p className="v4-walk__brand" aria-hidden>про нас</p>

          <div className="v4-walk__ui v4-walk__ui--inline" aria-hidden="true">
            <p className="v4-walk__chip"><b>03</b> О компании внутри дома</p>
            <ol className="v4-walk__bars">
              {walkStops.map((r, idx) => (
                <li key={r.title}>
                  <i><s ref={(el) => { barRefs.current[idx] = el }} /></i>
                  {r.tab}
                </li>
              ))}
            </ol>
          </div>

          <ol className="v4-walk__cards">
            {walkStops.map((r, idx) => (
              <li
                key={r.title}
                ref={(el) => { cardRefs.current[idx] = el }}
                className="v4-walk__card"
                style={{ opacity: idx === 0 ? 1 : 0, visibility: idx === 0 ? 'visible' : 'hidden' }}
              >
                <h3>{r.title}{r.area && <small> · {r.area}</small>}</h3>
                <p>{r.text}</p>
              </li>
            ))}
          </ol>

          <p className="v4-walk__disclaimer">
            3D-тур по возможному будущему дому («Тип 5»). Интерьер показан как пример — дома сдаются в предчистовой отделке.
          </p>
          <div ref={walkExitRef} className="v4-walk__exit" aria-hidden />
        </div>

        <div className="v4-story3d__foot">
          <span ref={footHintRef} style={{ opacity: 0 }}>Поведите мышью — 3D-дом откликается</span>
          <a href="#tipy">К выбору дома ↓</a>
        </div>
      </div>
    </section>
  )
}
