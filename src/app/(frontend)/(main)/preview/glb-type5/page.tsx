import type { Metadata } from 'next'
import GlbHousePreview from '@/components/GlbHousePreview'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'GLB «Тип 5» из Kimi 3D Make',
  robots: { index: false, follow: false },
  alternates: { canonical: '/' },
}

/** Просмотр модели из Kimi 3D Make перед интеграцией в генплан/«Построить». */
export default function GlbType5Page() {
  return (
    <main className="glb-type5">
      <h1>«Тип 5» · модель из Kimi 3D Make</h1>
      <p>
        Крути мышью, колесо — приближение. Модель: 5 575 треугольников, один меш, 6 материалов, origin в центре,
        Y=0 — подходит под инстансы в генплане.
      </p>
      <GlbHousePreview />
    </main>
  )
}
