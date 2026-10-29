import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Forum, Golos_Text, Manrope } from 'next/font/google'
import { CookieNotice } from '@/components/CookieNotice'
import { Metrika } from '@/components/Metrika'
import { MorphLayer } from '@/components/MorphLayer'
import { Reveal, ScrollProgress } from '@/components/Motion'
import { PageMotion } from '@/components/PageMotion'
import { getCompany, getDesign, getSeo, img } from '@/lib/data'
import { effectOn, paletteStyle } from '@/lib/look'
import { absUrl } from '@/lib/seo'
import { INDEXABLE, MAIN_URL } from '@/lib/site'
import './globals.css'
import './design.css'
import './v2.css'

// v2 (29.10, Igor's choice): headings and estate names in Forum — the lettering of the client's covers, so the covers and
// the page speak in one voice; text in Golos. The old pair stays for the dark palettes, not preloaded.
const forum = Forum({ variable: '--font-forum', subsets: ['latin', 'cyrillic'], weight: '400' })
const golos = Golos_Text({ variable: '--font-golos', subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600'] })
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin', 'cyrillic'], preload: false })
const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin', 'cyrillic'],
  weight: ['600'], // only the weight we use: fewer font files before the first paint
  preload: false,
})
const V2 = ['listva', 'shalfey']

const BASE: Metadata = {
  title: { default: 'Хороший дом — строим и продаём дома для жизни', template: '%s · Хороший дом' },
  description: 'Строительная компания «Хороший дом»: капитальные кирпичные дома с участком — готовые и под заказ по 12 проектам. Ипотека, гарантия 5 лет.',
  metadataBase: new URL(MAIN_URL),
  openGraph: { siteName: 'Хороший дом', locale: 'ru_RU', type: 'website' },
  // closed from search until launch: set NEXT_PUBLIC_INDEX=1 to open
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
}

// «SEO и поиск» in the admin: Webmaster / Search Console codes and the picture for shared links
export async function generateMetadata(): Promise<Metadata> {
  const [seo, company] = await Promise.all([getSeo(), getCompany()])
  // no picture set in «SEO и поиск» — the company's first-screen photo, so shared links never go without one
  const share = absUrl(img(seo.shareImage, 'wide') ?? img(company.heroPhoto, 'wide'))
  return {
    ...BASE,
    verification: { yandex: seo.yandexVerification || undefined, google: seo.googleVerification || undefined },
    openGraph: { ...BASE.openGraph, ...(share ? { images: [{ url: share }] } : {}) },
  }
}

export const viewport: Viewport = { themeColor: '#ffffff' }

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  // «Внешний вид» in the admin: the colour set (design.css → [data-palette]), the client's own colours, motion on/off
  const design = await getDesign()
  const motion = effectOn(design, 'motion')
  // a v2 palette switches the whole light look (v2.css → html[data-look="v2"]); the old dark ones keep design.css
  const v2 = V2.includes(design.palette ?? 'listva')
  return (
    // data-scroll-behavior: lets Next switch off CSS smooth scrolling while it jumps to the top of a new page
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      data-palette={design.palette && design.palette !== 'forest' ? design.palette : undefined}
      data-look={v2 ? 'v2' : undefined}
      className={[forum.variable, golos.variable, manrope.variable, cormorant.variable, motion ? '' : 'no-motion'].filter(Boolean).join(' ')}
      style={v2 ? undefined : paletteStyle(design)}
      suppressHydrationWarning
    >
      <head>
        {/* Reveal animations only arm when JS runs, so content is never hidden without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <ScrollProgress />
        <Reveal />
        {children}
        {/* here, above the page layouts: the «3D → house» transition must survive the route change */}
        <MorphLayer />
        {motion && <PageMotion />}
        <Metrika />
        <CookieNotice />
      </body>
    </html>
  )
}
