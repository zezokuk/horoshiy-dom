import { formatMillions } from '@/lib/format'
import type { HouseView } from '@/lib/view'

/**
 * «Готовые дома», first screen (20.10, instead of the door-hanger «key»): the cheapest free houses as a small fan of
 * real photos with their prices — each is a link to its house. Pointing at the fan opens it a little more.
 * One house per type, so the three cards do not show the same house.
 */
export function HouseStack({ houses }: { houses: HouseView[] }) {
  const seen = new Set<string>()
  const cards = houses
    .filter((h) => {
      const type = h.title.split(' (')[0]
      // Тип 12 has no photo of its own: the project's render with a pool would pass for a real house
      if (!h.photoCard || seen.has(type) || type.startsWith('Тип 12')) return false
      seen.add(type)
      return true
    })
    .slice(0, 3)
  if (!cards.length) return null
  return (
    <div className={`hstack hstack--${cards.length}`}>
      {/* the cheapest in front: drawn last */}
      {[...cards].reverse().map((h, i) => (
        <a
          key={h.code}
          href={h.href}
          className="hstack__card"
          data-i={cards.length - 1 - i}
        >
          <img src={h.photoCard} alt={`${h.title}, посёлок «${h.estateName}»`} loading="lazy" decoding="async" />
          <span className="hstack__tag">
            <b>{formatMillions(h.price)}</b>
            <span>
              {h.title.split(' (')[0]} · {h.estateName}
            </span>
          </span>
        </a>
      ))}
    </div>
  )
}
