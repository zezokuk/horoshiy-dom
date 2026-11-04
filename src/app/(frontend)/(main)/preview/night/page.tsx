import type { Metadata } from 'next'
import { HeroNight } from '@/components/heroes/HeroNight'

// a design sketch for Igor and Ilya (04.11): never in search, never the canonical home
export const metadata: Metadata = {
  title: 'Ночь → рассвет — черновик',
  robots: { index: false, follow: false },
  alternates: { canonical: '/' },
}

/** /preview/night: the first screen as one photo at night and in the morning (НОЧЬ-РАССВЕТ-для-Игоря.md). */
export default function NightPreview() {
  return (
    <>
      <HeroNight />
      <section className="section v2-sec">
        <div className="container">
          <p className="eyebrow">Черновик для Игоря и Ильи</p>
          <h2 className="title title--lg">Дальше — простой сайт: посёлки, дома с ценами, генплан, ипотека, заявка</h2>
          <p className="lead">Сказка закончилась на рассвете. Здесь начинаются факты.</p>
        </div>
      </section>
    </>
  )
}
