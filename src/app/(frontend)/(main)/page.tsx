import type { Metadata } from 'next'
import { HomeView } from './home'

// statuses and counts change in the admin and must show on the next load: no page cache here (see collections/revalidate.ts)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { alternates: { canonical: '/' } }

export default function Home() {
  // 20.10: «Чертёж → дом» (variant 4) is live; the others stay at /preview/<variant> for comparison
  return <HomeView hero="hero-4" />
}
