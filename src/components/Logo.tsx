import Link from 'next/link'

export function Logo({ href = '/', slogan }: { href?: string; slogan?: string | null }) {
  return (
    <Link href={href} className="logo" title="На главную">
      <svg width="40" height="30" viewBox="0 0 40 30" fill="none" aria-hidden>
        <path d="M2 16 20 3l18 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 13v14h24V13" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <rect x="17" y="17" width="6" height="10" fill="var(--gold)" />
        <path d="M28 6v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="logo__name">
        Хороший дом
        <small>{(slogan || 'сюда приводят мечты').toLowerCase()}</small>
      </span>
    </Link>
  )
}
