import { Shell } from '@/components/Shell'

/** Brand site (main domain): company, services, regions, company-wide pages. */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>
}
