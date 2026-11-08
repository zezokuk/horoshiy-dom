'use client'

import { useRef } from 'react'
import { useScrollVar } from '@/lib/useScrollVar'

/**
 * A short bridge from one block of the home to the next (Igor's vision, 08.11: «Выбрали посёлок → теперь дом → теперь
 * его место», otherwise the page is a set of pretty sections with no reason to scroll on). One line of the buyer's next
 * question and an arrow down to the block that answers it; a hairline draws itself as it comes up the screen.
 */
export function Bridge({ text, href }: { text: string; href: string }) {
  const ref = useRef<HTMLAnchorElement>(null)
  useScrollVar(ref, 0.95, 0.6)
  return (
    <a ref={ref} className="bridge" href={href}>
      <i className="bridge__line" aria-hidden />
      <span className="bridge__text">{text}</span>
      <i className="bridge__arrow" aria-hidden>
        ↓
      </i>
    </a>
  )
}
