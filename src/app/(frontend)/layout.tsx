import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import { Metrika } from '@/components/Metrika'
import { Reveal, ScrollProgress } from '@/components/Motion'
import { INDEXABLE, MAIN_URL } from '@/lib/site'
import './globals.css'

const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin', 'cyrillic'] })
const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin', 'cyrillic'],
  weight: ['600'], // only the weight we use: fewer font files before the first paint
})

export const metadata: Metadata = {
  title: { default: 'Хороший дом — строим и продаём дома для жизни', template: '%s · Хороший дом' },
  description: 'Строительная компания «Хороший дом»: капитальные кирпичные дома с участком — готовые и под заказ по 12 проектам. Ипотека, гарантия 5 лет.',
  metadataBase: new URL(MAIN_URL),
  openGraph: { siteName: 'Хороший дом', locale: 'ru_RU', type: 'website' },
  // closed from search until launch: set NEXT_PUBLIC_INDEX=1 to open
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#2c3a30' }

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-scroll-behavior: lets Next switch off CSS smooth scrolling while it jumps to the top of a new page
    <html lang="ru" data-scroll-behavior="smooth" className={`${manrope.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        {/* Reveal animations only arm when JS runs, so content is never hidden without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <ScrollProgress />
        <Reveal />
        {children}
        <Metrika />
      </body>
    </html>
  )
}
