import { HOUSE_LINES } from './house-lines-data'

/**
 * «Тип 5» as a clean line drawing (references 5–6): the lines are traced from the real photo, so the drawing sits
 * exactly on /design/hero1-photo.webp and hero1-house.webp (same 1673×897 box). Every line has pathLength 1, so CSS can
 * draw a group with `stroke-dashoffset: calc(1 - var(--g))`; the groups follow the building order.
 */
export function HouseLines({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1673 897" fill="none" aria-hidden focusable="false">
      {(['fence', 'wall', 'roof', 'hatch'] as const).map((g) => (
        <g key={g} className={`hl-${g}`}>
          {HOUSE_LINES[g].map((p) => (
            <polyline key={p} points={p} pathLength={1} />
          ))}
        </g>
      ))}
    </svg>
  )
}

/** A line-art hand that holds a sheet by its left edge (x = 300 of the 600 box): thumb in front, fingertips behind. */
export function HandLines({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 600" fill="none" aria-hidden focusable="false">
      <path d="M150 640 L160 520 Q228 500 292 524 L300 640" />
      <path d="M162 540 Q228 522 290 546" className="hand__soft" />
      <path d="M168 522 C150 470 140 420 150 370 C158 330 178 300 205 282 C230 262 262 246 300 236" />
      <path d="M300 280 C270 290 246 300 232 314" />
      <g className="hand__behind">
        <path d="M300 236 C330 230 352 234 356 248 C360 264 340 274 300 280" />
        <path d="M300 292 C334 288 356 294 358 308 C360 324 338 330 300 330" />
        <path d="M300 340 C330 338 350 344 350 358 C350 372 330 376 300 374" />
        <path d="M300 384 C322 384 336 390 334 402 C332 412 318 414 300 412" />
      </g>
      <path d="M286 524 C282 490 274 460 262 440 C250 420 252 398 270 384 C292 368 324 350 352 338 C374 330 392 338 394 354 C396 370 382 380 364 386 C338 396 318 408 306 426 C298 438 296 452 298 466" />
      <path d="M370 338 C382 340 388 348 386 358" className="hand__soft" />
      <path d="M196 300 C204 312 214 318 226 318" className="hand__soft" />
    </svg>
  )
}
