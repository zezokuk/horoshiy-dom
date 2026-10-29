'use client'

import { useEffect, useState } from 'react'

type Props = {
  title: string
  estate: string
  price: string
  facts: string[]
  /** «Записаться на показ» for a free house; a sold or reserved one sends to the free houses instead */
  cta: { label: string; href: string }
  planHref?: string
}

/**
 * The house page's purchase bar (v2, idea of the «Сашино» page from the client's references): price and the one action
 * stay at hand while the visitor reads the plan and the mortgage. It steps aside when the lead form or the footer is on
 * screen, so it never covers the form it leads to.
 */
export function HouseBar({ title, estate, price, facts, cta, planHref }: Props) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const targets = [document.getElementById('lead'), document.querySelector('.footer')].filter((x): x is HTMLElement => !!x)
    if (!targets.length) return
    const seen = new Set<Element>()
    const io = new IntersectionObserver((list) => {
      for (const e of list) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)
      setHidden(seen.size > 0)
    })
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])

  return (
    <div className={`v2-bar ${hidden ? 'is-hidden' : ''}`} role="region" aria-label="Цена и запись на показ">
      <div className="v2-bar__in">
        <div className="v2-bar__name">
          <b>{title}</b>
          <span>{estate}</span>
        </div>
        <ul className="v2-bar__facts">
          {facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
          {planHref && (
            <li>
              <a href={planHref}>Планировка ↓</a>
            </li>
          )}
        </ul>
        <b className="v2-bar__price">{price}</b>
        <a href={cta.href} className="btn btn--gold v2-bar__cta">
          {cta.label}
        </a>
      </div>
    </div>
  )
}
