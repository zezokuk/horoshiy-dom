/** «20 мин» → a big «20» and a small «мин»: the number is what people read (the «15 minute walk» reference). */
function splitTime(v: string) {
  const m = v.match(/^\s*([\d,.–-]+)\s*(.*)$/)
  return m ? { n: m[1], unit: m[2] } : { n: v, unit: '' }
}

/** What is near an estate, in big minutes: used on the estate page and on its promo pages. */
export function Nearby({ items }: { items: { id?: string | null; label: string; value: string }[] }) {
  if (!items.length) return null
  return (
    <ul className="near">
      {items.map((n) => {
        const t = splitTime(n.value)
        return (
          <li key={n.id ?? n.label}>
            <b>{t.n}</b>
            <span className="near__unit">{t.unit}</span>
            <span className="near__what">{n.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
