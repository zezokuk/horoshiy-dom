import type { PromoView } from '@/lib/view'

/** Active promos from the admin («Продажи → Акции»). Renders nothing when there are none. */
export function PromoCards({ promos }: { promos: PromoView[] }) {
  if (!promos.length) return null
  return (
    <div className="promos">
      {promos.map((p) => (
        <a key={p.id} href={p.href} className="promo" data-reveal>
          {p.image && <img src={p.image} alt="" loading="lazy" />}
          <div className="promo__body">
            <span className="promo__tag">{p.regionName ? `Акция · ${p.regionName}` : 'Акция'}</span>
            <b>{p.title}</b>
            {p.text && <p>{p.text}</p>}
            <span className="promo__cta">{p.cta} →</span>
          </div>
        </a>
      ))}
    </div>
  )
}
