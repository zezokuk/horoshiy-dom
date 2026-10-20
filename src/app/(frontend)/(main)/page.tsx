import type { Metadata } from 'next'
import { getDesign } from '@/lib/data'
import { pageMeta } from '@/lib/look'
import { HERO_VARIANTS, HomeView, type HeroKind } from './home'

// statuses and counts change in the admin and must show on the next load: no page cache here (see collections/revalidate.ts)
export const dynamic = 'force-dynamic'

const META: Metadata = { alternates: { canonical: '/' } }
// title and description can be set in the admin: «SEO и поиск» → Главная
export const generateMetadata = () => pageMeta('home', META)

export default async function Home() {
  // the first screen is chosen in the admin: «Внешний вид» (20.10: «Vintara», variant 5, by default); all of them at /preview/<variant>
  const { hero } = await getDesign()
  const variant: HeroKind = hero === 'current' || HERO_VARIANTS.includes(hero as never) ? (hero as HeroKind) : 'hero-5'
  return <HomeView hero={variant} />
}
