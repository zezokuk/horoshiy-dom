import type { Metadata } from 'next'
import { HomeView } from './home'

// statuses and counts change in the admin and must show on the next load: no page cache here (see collections/revalidate.ts)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { alternates: { canonical: '/' } }

export default function Home() {
  return <HomeView />
}
