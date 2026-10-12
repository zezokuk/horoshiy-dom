'use client'

import { useEffect, useRef, useState } from 'react'
import type { TourPoint } from '@/lib/view'

/**
 * The house plan with numbered circles (the client's idea): a tap on a circle opens a short vertical video of that room.
 * The video sits in a native <dialog>: Esc and the system back gesture close it, focus stays inside.
 * Videos load only when opened (preload="none"), so the plan costs nothing until someone is curious.
 */
export function PlanTour({
  plan,
  alt,
  points,
}: {
  plan: string
  alt: string
  points: TourPoint[]
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [open, setOpen] = useState<number | null>(null)
  const current = points.find((p) => p.n === open)

  const show = (n: number) => {
    setOpen(n)
    if (!dialog.current?.open) dialog.current?.showModal()
  }
  const close = () => dialog.current?.close()

  // a new point: start its video from the beginning (muted autoplay is allowed everywhere; the visitor can unmute)
  useEffect(() => {
    const v = video.current
    if (!v || open === null) return
    v.currentTime = 0
    v.play().catch(() => {})
  }, [open])

  return (
    <div className="tour">
      <div className="tour__scroll">
        <div className="tour__plan">
          <img src={plan} alt={alt} loading="lazy" decoding="async" />
          {points.map((p) => (
            <button
              key={p.n}
              type="button"
              className="tour__dot"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={() => show(p.n)}
              aria-label={`Видео: ${p.label}`}
            >
              <span>{p.n}</span>
              <i className="tour__tip" aria-hidden>
                {p.label}
              </i>
            </button>
          ))}
        </div>
      </div>
      {points.length > 0 && (
        <div className="tour__list">
          <span className="tour__hint">Нажмите на кружок — покажем комнату на видео</span>
          {points.map((p) => (
            <button key={p.n} type="button" className="chip tour__chip" onClick={() => show(p.n)}>
              <b>{p.n}</b> {p.label}
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialog}
        className="tour__modal"
        aria-label={current ? `Видео: ${current.label}` : 'Видео комнаты'}
        onClose={() => {
          video.current?.pause()
          setOpen(null)
        }}
        // a click on the dimmed backdrop (the dialog element itself, outside its content) closes it
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        {current && (
          <div className="tour__box">
            <video
              ref={video}
              key={current.video}
              src={current.video}
              poster={current.poster}
              controls
              playsInline
              muted
              autoPlay
              preload="none"
            />
            <div className="tour__bar">
              <b>
                {current.n}. {current.label}
              </b>
              <div className="tour__nav">
                {points.length > 1 && (
                  <button
                    type="button"
                    onClick={() => show(points[(points.indexOf(current) + 1) % points.length].n)}
                  >
                    Следующая →
                  </button>
                )}
                <button type="button" onClick={close} aria-label="Закрыть видео">
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  )
}
