import type { ReactNode } from 'react'
import { getCompany } from '@/lib/data'
import { V4Bar, V4Footer } from '@/v4/Shell'
import '@/v3/v3.css'
import '@/v4/v4.css'

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const company = await getCompany()
  return <div className="v3 v4">
    <V4Bar phone={company.phone} always bookingHref="/v4#evf-form" />
    <main className="v4-legal">
      <a className="v4-legal__back" href="/v4">← На главную</a>
      {children}
    </main>
    <V4Footer since={company.since} phone={company.phone} />
  </div>
}
