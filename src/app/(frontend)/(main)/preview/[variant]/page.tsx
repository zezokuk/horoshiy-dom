import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HERO_VARIANTS, HomeView, type HeroKind } from '../../home'

export const dynamic = 'force-dynamic'

// design previews for choosing the first screen: never in search, never the canonical home
export const metadata: Metadata = {
  title: 'Варианты первого экрана',
  robots: { index: false, follow: false },
  alternates: { canonical: '/' },
}

// [short for phones, the rest on computers]
const NAMES: Record<HeroKind, [string, string]> = {
  current: ['0', ' · Прежний'],
  'hero-1': ['1', ' · Дом перед названием'],
  'hero-2': ['2', ' · Через генплан'],
  'hero-3': ['3', ' · Минимализм'],
  'hero-4': ['4', ' · Чертёж → дом'],
  'hero-5': ['5', ' · Vintara: дом в тон бренда'],
  'hero-6': ['6', ' · v2: дом на весь экран'],
}

type Props = { params: Promise<{ variant: string }> }

/** /preview/current, /preview/hero-1…5: the whole home with another first screen and a switcher between the variants. */
export default async function HeroPreview({ params }: Props) {
  const { variant } = await params
  const all: HeroKind[] = ['current', ...HERO_VARIANTS]
  if (!all.includes(variant as HeroKind)) notFound()
  const links = all.map((v): [string, HeroKind] => [`/preview/${v}`, v])
  return (
    <>
      <HomeView hero={variant as HeroKind} />
      <nav className="preview-switch" aria-label="Варианты первого экрана">
        <span>Первый экран:</span>
        {links.map(([href, v]) => (
          <a key={v} href={href} aria-current={v === variant ? 'page' : undefined}>
            {NAMES[v][0]}
            <i>{NAMES[v][1]}</i>
          </a>
        ))}
      </nav>
    </>
  )
}
