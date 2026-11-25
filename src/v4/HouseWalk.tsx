'use client'

import { useEffect, useRef, useState } from 'react'
import './houseWalk.css'

const media = '/v4/walk/threshold'
const portraitFrame = '(max-width: 640px) and (max-aspect-ratio: 63/100)'
const chapters = [
  { name: 'Крыльцо', note: 'Кирпичная кладка и тёплый навес у входа', start: 0, image: media + '-poster.webp', portrait: media + '-poster-phone.webp' },
  { name: 'Холл', note: 'Свободный вход и место под гардеробную', start: 5.4, image: '/v4/img/in-hall.webp', portrait: '/v4/img/in-hall-phone.webp' },
  { name: 'Кухня-гостиная', note: 'Панорамный свет для больших семейных ужинов', start: 10.4, image: '/v4/img/in-kitchen.webp', portrait: '/v4/img/in-kitchen-phone.webp' },
  { name: 'Терраса', note: 'Шаг из гостиной прямо в собственный сад', start: 15.2, image: '/v4/img/in-terrace.webp', portrait: '/v4/img/in-terrace-phone.webp' },
]
const filmLength = 17.067
const timestamp = (seconds: number) => new Date(Math.max(0, seconds) * 1000).toISOString().slice(14, 19)

const ROUTE_WAYPOINTS = [
  { p: 0, x: 35, y: 92, angle: -25 },
  { p: 0.316, x: 44, y: 52, angle: 0 },
  { p: 0.609, x: 104, y: 52, angle: 78 },
  { p: 0.89, x: 154, y: 60, angle: 90 },
  { p: 1, x: 158, y: 60, angle: 90 },
]

function cameraPose(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress))
  for (let i = 0; i < ROUTE_WAYPOINTS.length - 1; i++) {
    const a = ROUTE_WAYPOINTS[i]
    const b = ROUTE_WAYPOINTS[i + 1]
    if (clamped >= a.p && clamped <= b.p) {
      const k = (clamped - a.p) / Math.max(0.0001, b.p - a.p)
      return {
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        angle: a.angle + (b.angle - a.angle) * k,
      }
    }
  }
  return ROUTE_WAYPOINTS[ROUTE_WAYPOINTS.length - 1]
}

function PlayIcon({ playing }: { playing: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
    {playing ? <path d="M7 5h3v14H7zm7 0h3v14h-3z" /> : <path d="M7 4.5 20 12 7 19.5z" />}
  </svg>
}

export function HouseWalk({ href, linkText, areas }: { href: string; linkText: string; areas: (number | null)[] }) {
  const screen = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const manualPause = useRef(false)
  const pendingTime = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [decoded, setDecoded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(filmLength)
  const chapter = chapters.reduce((active, item, i) => time >= item.start - 0.03 ? i : active, 0)
  const current = chapters[chapter]
  const still = decoded && !failed ? chapters[0] : current
  const pose = cameraPose(duration > 0 ? time / duration : 0)

  function prepare(player: HTMLVideoElement) {
    const portrait = window.matchMedia(portraitFrame).matches
    const src = media + (portrait ? '-phone.mp4' : '.mp4')
    if (player.getAttribute('src') === src) return
    player.src = src
    player.load()
  }

  useEffect(() => {
    const el = screen.current
    const player = video.current
    if (!el || !player) return
    const framing = window.matchMedia(portraitFrame)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    const allowAuto = () => !reduced.matches && !document.documentElement.classList.contains('no-motion') && !connection?.saveData
    let inFrame = false
    const sync = () => {
      if (!inFrame || document.hidden) player.pause()
      else if (allowAuto() && !manualPause.current && !player.ended && !player.error) {
        prepare(player)
        void player.play().catch(() => { /* The play button also works with autoplay disabled. */ })
      }
    }
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && allowAuto()) prepare(player)
    }, { rootMargin: '280px 0px' })
    const observer = new IntersectionObserver(([entry]) => {
      inFrame = entry.intersectionRatio >= 0.55
      sync()
    }, { threshold: [0, 0.55] })
    const preferenceChanged = () => {
      if (!allowAuto()) player.pause()
      else sync()
    }
    const reframe = () => {
      if (!player.hasAttribute('src')) return
      const wasPlaying = !player.paused
      if (player.readyState >= 1) pendingTime.current = player.currentTime
      setDecoded(false)
      setFailed(false)
      prepare(player)
      if (wasPlaying && !document.hidden) void player.play().catch(() => {})
    }
    framing.addEventListener('change', reframe)
    preload.observe(el)
    observer.observe(el)
    reduced.addEventListener('change', preferenceChanged)
    document.addEventListener('visibilitychange', sync)
    return () => {
      framing.removeEventListener('change', reframe)
      preload.disconnect()
      observer.disconnect()
      reduced.removeEventListener('change', preferenceChanged)
      document.removeEventListener('visibilitychange', sync)
      player.pause()
    }
  }, [])

  function toggle() {
    const player = video.current
    if (!player) return
    if (!player.paused) {
      manualPause.current = true
      player.pause()
      return
    }
    manualPause.current = false
    prepare(player)
    if (player.ended) player.currentTime = 0
    void player.play().catch(() => { /* Keep the rendered still and the manual play control. */ })
  }

  function seek(index: number) {
    const next = chapters[index].start
    const player = video.current
    pendingTime.current = next
    setTime(next)
    if (player && !player.error && player.readyState >= 1) player.currentTime = next
  }

  return <section id="vnutri" className="house-walk" aria-label="За порогом — прогулка по дому типа 5">
    <div className="house-walk__leadin">
      <p className="house-walk__leadin-kicker">Прогулка по проекту</p>
      <p className="house-walk__leadin-text">В ролике показан пример обустройства. Дом сдаётся в предчистовой отделке White Box.</p>
    </div>
    <div ref={screen} className="house-walk__screen">
      <picture className="house-walk__still">
        <source media={portraitFrame} srcSet={still.portrait} />
        <img src={still.image} alt="" loading="lazy" />
      </picture>
      <video ref={video} muted playsInline preload="metadata" aria-label="Визуализация прогулки от фасада через дом к террасе"
        className={decoded && !failed ? 'is-ready' : undefined}
        onLoadedMetadata={e => {
          const player = e.currentTarget
          if (Number.isFinite(player.duration)) setDuration(player.duration)
          player.currentTime = pendingTime.current
        }}
        onLoadedData={() => setDecoded(true)}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => { setFailed(true); setPlaying(false) }}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
      />
      <div className="house-walk__shade" />
      <div className="house-walk__top">
        <span>Проект «Тип 5» <i /> Визуализация</span>
        <span className="house-walk__clock" aria-hidden="true">{timestamp(time)} <i>/</i> {timestamp(duration)}</span>
      </div>
      <div className="house-walk__caption" data-intro={chapter === 0} data-crossing={chapter === 0 && time > 2}>
        <div className="house-walk__room" key={chapter}>
          <h2>{chapter === 0 ? <>За <em>порогом</em></> : current.name}</h2>
          {areas[chapter] != null && <span>{areas[chapter].toLocaleString('ru-RU')} м²</span>}
        </div>
        <p>{chapter === 0 ? 'От крыльца до террасы' : current.note}</p>
      </div>
      <aside className="house-walk__minimap" aria-label="Мини-карта маршрута по планировке">
        <div className="house-walk__minimap-head">
          <span>План маршрута</span>
          <b>{current.name}</b>
        </div>
        <svg viewBox="0 0 180 116" role="img" aria-label="Схема: крыльцо, холл, кухня-гостиная, терраса">
          {/* Внешний контур дома */}
          <rect x="14" y="14" width="128" height="68" rx="4" className="hw-map-shell" />
          {/* Спальни (фоновые зоны) */}
          <rect x="18" y="18" width="48" height="18" rx="2" className="hw-map-muted" />
          <rect x="70" y="18" width="42" height="18" rx="2" className="hw-map-muted" />

          {/* 4 кликабельные зоны маршрута */}
          <g className={chapter === 0 ? 'hw-map-room is-active' : 'hw-map-room'} onClick={() => seek(0)}>
            <rect x="18" y="82" width="38" height="24" rx="2" />
            <text x="37" y="97">Крыльцо</text>
          </g>
          <g className={chapter === 1 ? 'hw-map-room is-active' : 'hw-map-room'} onClick={() => seek(1)}>
            <rect x="18" y="40" width="48" height="38" rx="2" />
            <text x="42" y="62">Холл</text>
          </g>
          <g className={chapter === 2 ? 'hw-map-room is-active' : 'hw-map-room'} onClick={() => seek(2)}>
            <rect x="70" y="40" width="68" height="38" rx="2" />
            <text x="104" y="62">Гостиная</text>
          </g>
          <g className={chapter === 3 ? 'hw-map-room is-active' : 'hw-map-room'} onClick={() => seek(3)}>
            <rect x="142" y="28" width="28" height="54" rx="2" />
            <text x="156" y="57">Сад</text>
          </g>

          {/* Линия маршрута и текущая камера */}
          <path d="M 35 92 L 44 52 L 104 52 L 154 60" className="hw-map-path" />
          <g className="house-walk__cam" transform={`translate(${pose.x.toFixed(1)}, ${pose.y.toFixed(1)}) rotate(${pose.angle.toFixed(1)})`}>
            <path d="M 0 0 L -9 -22 A 24 24 0 0 1 9 -22 Z" className="hw-map-cone" />
            <circle cx="0" cy="0" r="4.5" className="hw-map-dot" />
          </g>
        </svg>
      </aside>
      {!failed && <button type="button" className="house-walk__play" onClick={toggle} aria-label={playing ? 'Пауза' : 'Воспроизвести прогулку'}>
        <PlayIcon playing={playing} />
      </button>}
    </div>
    <div className="house-walk__deck">
      <nav aria-label="Главы прогулки" className="house-walk__chapters">
        {chapters.map((item, i) => {
          const end = chapters[i + 1]?.start ?? duration
          const progress = Math.max(0, Math.min(1, (time - item.start) / (end - item.start)))
          return <button key={item.name} type="button" aria-label={item.name} aria-current={chapter === i ? 'step' : undefined} onClick={() => seek(i)}>
            <span className="house-walk__track" aria-hidden="true"><i style={{ transform: 'scaleX(' + progress + ')' }} /></span>
            <span className="house-walk__chapter-label">
              <span className="house-walk__thumb" aria-hidden="true" style={{ backgroundPositionX: (i / (chapters.length - 1)) * 100 + '%' }} />
              <span className="house-walk__chapter-copy" aria-hidden="true">
                <b>{item.name}</b>
                <small>{item.note}</small>
              </span>
            </span>
          </button>
        })}
      </nav>
      <a href={href} className="house-walk__link">{linkText}<span aria-hidden="true">↗</span></a>
    </div>
  </section>
}
