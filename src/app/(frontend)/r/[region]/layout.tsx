import { notFound } from 'next/navigation'
import { Shell } from '@/components/Shell'
import { getRegion } from '@/lib/data'

/** A region (krd.домен.ru is rewritten here by src/proxy.ts): same frame, the region's phone and menu. */
export default async function RegionLayout({ children, params }: { children: React.ReactNode; params: Promise<{ region: string }> }) {
  const { region: slug } = await params
  const region = await getRegion(slug)
  if (!region) notFound()
  return <Shell region={region}>{children}</Shell>
}
