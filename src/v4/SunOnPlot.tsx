'use client'

import { useState } from 'react'

/**
 * Интерактивный виджет «Солнце на вашем участке» (по Figma 278-1609):
 * показывает ориентацию участка (по углу axis_deg из плана) и движение солнца от 08:00 до 20:00.
 */
export function SunOnPlot({ axisDeg = 80, label }: { axisDeg?: number; label?: string }) {
  const [hour, setHour] = useState(15)

  // угол на дуге с востока (справа-снизу, 8ч) через юг/верх (13ч) на запад (слева-снизу, 20ч)
  const t = (hour - 8) / 12
  // Дуга сверху как в макете 278-1609: x от 28 до 192, y дугой от 84 до 28 и обратно к 84
  const sunX = 110 + Math.cos(Math.PI - t * Math.PI) * 82
  const sunY = 82 - Math.sin(t * Math.PI) * 56

  const note =
    hour < 11
      ? `${String(hour).padStart(2, '0')}:00 · утреннее солнце со стороны крыльца и кухни`
      : hour < 16
        ? `${String(hour).padStart(2, '0')}:00 · максимум дневного света во дворе и на террасе`
        : `${String(hour).padStart(2, '0')}:00 · мягкий вечерний свет, терраса в уютной тени`

  const houseRot = Math.round(90 - axisDeg)

  return (
    <div className="v4-sun">
      <div className="v4-sun__head">
        <span>Солнце на участке</span>
        <b>{String(hour).padStart(2, '0')}:00</b>
      </div>
      <svg viewBox="0 0 220 112" className="v4-sun__svg" role="img" aria-label={`Солнце на участке в ${hour}:00`}>
        <text x="110" y="13" textAnchor="middle" className="v4-sun__n">С</text>
        <path d="M28,84 A82,56 0 0,1 192,84" fill="none" stroke="#d98a3c" strokeWidth="1.5" strokeDasharray="4 4" />
        <g transform={`translate(110 66) rotate(${houseRot})`}>
          <rect x="-32" y="-32" width="64" height="64" rx="5" fill="#e6f0e8" stroke="#85a68e" strokeWidth="1.2" />
          <rect x="-15" y="-15" width="30" height="28" rx="3" fill="#94563d" />
        </g>
        <circle cx={sunX} cy={sunY} r="7.5" fill="#e79a42" />
        <circle cx={sunX} cy={sunY} r="12" fill="#e79a42" fillOpacity="0.2" />
      </svg>
      <input
        type="range"
        min={8}
        max={20}
        step={1}
        value={hour}
        aria-label="Время дня для положения солнца"
        onChange={(e) => setHour(Number(e.target.value))}
      />
      <p className="v4-sun__cap">{label ?? note}</p>
    </div>
  )
}
