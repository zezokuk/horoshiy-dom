'use client'

import { useRef } from 'react'
import { useScrollVar } from '@/lib/useScrollVar'

/**
 * The line that draws the house on the first screen goes on down the page (30.10, instead of copying ERA's lines): one
 * stretch across each gap between screens, drawn by scrolling, each starting where the last one ended, so the eye wants to
 * see where it leads. It ends in the brand's little house over the lead form. `from` and `to` are x in a 1200-wide box.
 */
export function Thread({ from, to, end = false }: { from: number; to: number; end?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollVar(ref, 0.92, 0.5)
  return (
    <div className={`thread ${end ? 'thread--end' : ''}`} ref={ref} aria-hidden>
      <svg viewBox="0 0 1200 240" preserveAspectRatio="none" fill="none" focusable="false">
        <path d={`M${from},0 C${from},130 ${to},110 ${to},240`} pathLength={1} />
      </svg>
      {end && (
        <svg className="thread__house" viewBox="0 0 48 44" fill="none" focusable="false">
          <path d="M3 21 24 4l21 17M9 17v24h30V17" pathLength={1} />
        </svg>
      )}
    </div>
  )
}
