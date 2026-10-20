'use client'

import { useState } from 'react'
import type { RoomLabel } from '@/lib/view'

const m2 = (a: number) => `${a.toLocaleString('ru-RU')} м²`

/**
 * The project's plan as a furnished top-down render with the room areas from the plan on it.
 * Tabs: «3D-вид» (the render, labels) and «Чертёж» (the client's plan as is). Hovering a room in the list
 * lights its label on the picture and the other way round. The render is an illustration — the note says so.
 */
export function PlanRender({ render, plan, rooms, alt }: { render: string; plan?: string | null; rooms: RoomLabel[]; alt: string }) {
  const [view, setView] = useState<'render' | 'plan'>('render')
  const [on, setOn] = useState<number | null>(null)
  const light = (i: number | null) => () => setOn(i)

  return (
    <div className="pr">
      {plan && (
        <div className="pr__tabs" role="tablist" aria-label="Вид планировки">
          <button type="button" role="tab" aria-selected={view === 'render'} onClick={() => setView('render')}>
            3D-вид
          </button>
          <button type="button" role="tab" aria-selected={view === 'plan'} onClick={() => setView('plan')}>
            Чертёж
          </button>
        </div>
      )}
      <div className={`pr__stage ${view === 'plan' ? 'pr__stage--plan' : ''}`}>
        {view === 'render' ? (
          <>
            <img src={render} alt={`${alt}: визуализация с мебелью`} loading="lazy" decoding="async" />
            {rooms.map((r, i) => (
              <span
                key={`${r.name}-${i}`}
                className={`pr__room ${on === i ? 'is-on' : ''}`}
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
                onMouseEnter={light(i)}
                onMouseLeave={light(null)}
              >
                <b>{m2(r.area)}</b>
                <i>{r.name}</i>
              </span>
            ))}
          </>
        ) : (
          plan && <img src={plan} alt={alt} loading="lazy" decoding="async" />
        )}
      </div>
      {rooms.length > 0 && (
        <ul className="pr__list">
          {rooms.map((r, i) => (
            <li key={`${r.name}-${i}`}>
              <button type="button" className={on === i ? 'is-on' : ''} onMouseEnter={light(i)} onMouseLeave={light(null)} onFocus={light(i)} onBlur={light(null)} onClick={() => setView('render')}>
                {r.name} <b>{m2(r.area)}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="pr__note">Визуализация по планировке проекта, мебель — для примера. Площади — по проекту.</p>
    </div>
  )
}
