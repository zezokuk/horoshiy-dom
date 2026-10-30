'use client'

import { useEffect, useRef } from 'react'

// where the sprinkler stands in the picture (public/design/scenes/lawn.webp, 2000×1116)
const W = 2000
const H = 1116
const NOZZLE_X = 1335
const NOZZLE_Y = 955
const JETS = 11

type Drop = { x: number; y: number; vx: number; vy: number; size: number; life: number }

/**
 * The water on the lawn picture is alive (Igor's idea, 30.10): drops fly up from the sprinkler in jets that sway slowly from
 * side to side and fall back. Computers only, only while the slide is on screen, and not with reduced motion.
 */
export function Sprinkle() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const box = canvas?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !box || !ctx) return
    if (!window.matchMedia('(min-width: 960px)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('no-motion')) return

    let k = 1 // screen pixels per picture pixel; the slide covers its box like object-fit: cover
    let ox = 0
    let oy = 0
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const r = box.getBoundingClientRect()
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      k = Math.max(canvas.width / W, canvas.height / H)
      ox = (canvas.width - W * k) / 2
      oy = (canvas.height - H * k) / 2
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)

    const drops: Drop[] = []
    const spawn = (now: number) => {
      const jet = Math.floor(Math.random() * JETS) / (JETS - 1) - 0.5 // −0.5…0.5 across the fan
      const sway = Math.sin(now / 1700) * 0.28
      const angle = -Math.PI / 2 + (jet * 1.9 + sway) + (Math.random() - 0.5) * 0.05
      const speed = (720 + Math.random() * 170) * k
      drops.push({
        x: ox + NOZZLE_X * k,
        y: oy + NOZZLE_Y * k,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 0.7 + Math.random() * 0.7,
        life: 1,
      })
    }

    let frame = 0
    let last = 0
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016)
      last = now
      for (let i = 0; i < 3; i++) if (drops.length < 260) spawn(now)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]
        d.vy += 620 * k * dt
        d.x += d.vx * dt
        d.y += d.vy * dt
        d.life -= dt * 0.72
        if (d.life <= 0 || d.y > oy + (NOZZLE_Y + 60) * k) {
          drops.splice(i, 1)
          continue
        }
        // a short streak along its flight: round dots read as snow
        ctx.globalAlpha = Math.min(1, d.life * 2.4) * 0.6
        ctx.strokeStyle = '#fff8e8'
        ctx.lineWidth = d.size
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.vx * 0.012, d.y - d.vy * 0.012)
        ctx.stroke()
      }
    }

    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(frame)
      if (e.isIntersecting) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    })
    io.observe(box)
    return () => {
      cancelAnimationFrame(frame)
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} className="v2-slide__water" aria-hidden />
}
