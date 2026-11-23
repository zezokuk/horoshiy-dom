'use client'

import { useRef, useState, type KeyboardEvent, type TouchEvent } from 'react'

type Frame = { src: string; caption: string; alt: string; plan?: boolean }

function Arrow({ back = false }: { back?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.5" style={back ? { transform: 'rotate(180deg)' } : undefined}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
}

export function HouseDetailGallery({ frames }: { frames: readonly Frame[] }) {
  const [index, setIndex] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const frame = frames[index]
  if (!frame) return null
  const multiple = frames.length > 1
  const step = (delta: number) => setIndex((i) => (i + delta + frames.length) % frames.length)
  const keyboard = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      step(event.key === 'ArrowRight' ? 1 : -1)
    }
  }
  const start = (e: TouchEvent) => { origin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const end = (e: TouchEvent) => {
    if (!origin.current) return
    const dx = e.changedTouches[0].clientX - origin.current.x
    const dy = e.changedTouches[0].clientY - origin.current.y
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1)
    origin.current = null
  }
  const controls = multiple && <>
    <button type="button" aria-label="Предыдущий кадр" onClick={() => step(-1)}><Arrow back /></button>
    <button type="button" aria-label="Следующий кадр" onClick={() => step(1)}><Arrow /></button>
  </>
  const count = <span className="hd-count">{String(index + 1).padStart(2, '0')} <span>/ {String(frames.length).padStart(2, '0')}</span></span>

  return (
    <section className="hd-gallery" aria-label="Галерея дома" onKeyDown={keyboard}>
      <figure>
        <div className={'hd-gallery-stage' + (frame.plan ? ' is-plan' : '')} onTouchStart={start} onTouchEnd={end}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={frame.src} src={frame.src} alt={frame.alt} fetchPriority={index === 0 ? 'high' : 'auto'} />
          <button className="hd-expand" type="button" aria-label="Развернуть изображение" onClick={() => dialog.current?.showModal()}>
            <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none"><path d="M4 10V4h6m4 0h6v6m0 4v6h-6m-4 0H4v-6" /></svg>
          </button>
        </div>
        <figcaption className="hd-gallery-bar">
          <div className="hd-photo-caption" aria-live="polite">{count}<span>{frame.caption}</span></div>
          {multiple && <div className="hd-gallery-arrows">{controls}</div>}
        </figcaption>
      </figure>
      {multiple && <div className="hd-thumbs" role="group" aria-label="Выбрать кадр">
        {frames.map((f, i) => <button key={f.src} type="button" aria-label={`Кадр ${i + 1}. ${f.alt}`} aria-pressed={i === index} onClick={() => setIndex(i)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.src} alt="" loading="lazy" />
        </button>)}
      </div>}
      <dialog className="hd-lightbox" ref={dialog} aria-label="Галерея на весь экран">
        <div className="hd-lightbox-panel">
          <div className="hd-lightbox-top">{count}<button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Закрыть галерею">Закрыть <span aria-hidden="true">×</span></button></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frame.src} alt={frame.alt} loading="lazy" onTouchStart={start} onTouchEnd={end} />
          <div className="hd-lightbox-bottom"><p aria-live="polite">{frame.caption}</p>{multiple && <div className="hd-gallery-arrows">{controls}</div>}</div>
        </div>
      </dialog>
    </section>
  )
}
