import type { Metadata } from 'next'
import { MotionRoot } from '@/v3/motion/MotionRoot'

// v3: проверка одной обёртки движения (GSAP + ScrollTrigger + SplitText + Lenis), 12.11.2026
export const metadata: Metadata = {
  title: 'v3 — движение, проверка',
  robots: { index: false, follow: false },
  alternates: { canonical: '/' },
}

const sec: React.CSSProperties = { padding: '96px 24px', maxWidth: 1100, margin: '0 auto' }
const h: React.CSSProperties = { fontSize: 'clamp(36px,5vw,64px)', lineHeight: 1.05, margin: '0 0 24px' }

export default function V3MotionPreview() {
  return (
    <MotionRoot>
      <section style={sec}>
        <p>Прокрутите вниз: каждое из движений срабатывает при входе блока в экран.</p>
        <h1 data-move="lines" style={h} data-testid="lines">
          Дом, в который хочется возвращаться — строки поднимаются по одной
        </h1>
      </section>
      <section style={{ ...sec, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
        {['Ритм', 'Чувство', 'Воздух'].map((w) => (
          <div key={w} data-move="up" data-testid="up" style={{ background: '#F6F4EF', borderRadius: 14, padding: 28, fontSize: 28 }}>
            {w}
          </div>
        ))}
      </section>
      <section style={{ ...sec, height: '70vh', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-move="roof" data-testid="roof" src="/design/hero-morning.webp" alt="Окно-крыша"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
      </section>
      <section data-daylight style={{ ...sec, height: '80vh', overflow: 'hidden', position: 'relative', borderRadius: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-parallax="0.2" src="/design/morning-breakfast.webp" alt="Глубина"
          style={{ position: 'absolute', inset: '-10% 0', width: '100%', height: '120%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(18,32,70,calc(var(--daylight,0) * .6))' }} />
      </section>
      <section style={{ ...sec, height: '60vh' }}><p data-move="up">Конец проверки.</p></section>
    </MotionRoot>
  )
}
