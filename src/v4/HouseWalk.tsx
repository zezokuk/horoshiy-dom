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

function PlayIcon({ playing }: { playing: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
    {playing ? <path d="M7 5h3v14H7zm7 0h3v14h-3z" /> : <path d="M7 4.5 20 12 7 19.5z" />}
  </svg>
}

export function HouseWalk({ href, linkText, areas }: { href: string; linkText: string; areas: (number | null)[] }) {
  const stage = useRef<HTMLElement>(null)
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

  function prepare(player: HTMLVideoElement) {
    const portrait = window.matchMedia(portraitFrame).matches
    const src = media + (portrait ? '-phone.mp4' : '.mp4')
    if (player.getAttribute('src') === src) return
    player.src = src
    player.load()
  }

  useEffect(() => {
    const el = stage.current
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

  return <section id="vnutri" ref={stage} className="house-walk" aria-label="За порогом — прогулка по дому типа 5">
    <div className="house-walk__leadin">
      <p className="house-walk__leadin-kicker">Внутри готового дома</p>
      <p className="house-walk__leadin-text">Загляните за порог: как устроено пространство от крыльца и прихожей до светлой кухни-гостиной с выходом на террасу.</p>
    </div>
    <div className="house-walk__screen">
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
        <span>Проект «Тип 5» <i /> Пример интерьера · сдаётся в предчистовой отделке White Box</span>
        <span className="house-walk__clock" aria-hidden="true">{timestamp(time)} <i>/</i> {timestamp(duration)}</span>
      </div>
      <div className="house-walk__caption" data-intro={chapter === 0} data-crossing={chapter === 0 && time > 2}>
        <div className="house-walk__room" key={chapter}>
          <h2>{chapter === 0 ? <>За <em>порогом</em></> : current.name}</h2>
          {areas[chapter] && <span>{areas[chapter].toLocaleString('ru-RU')} м²</span>}
        </div>
        <p>{chapter === 0 ? 'От крыльца до террасы · светлый одноэтажный дом без лишних коридоров' : current.note}</p>
      </div>
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
