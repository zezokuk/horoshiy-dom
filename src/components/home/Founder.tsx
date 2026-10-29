export type FounderView = {
  photo?: string
  name?: string | null
  role?: string | null
  quote?: string | null
}

export type Fact = { value: string; label: string }

// the client's own words (27.10, «О компании»), until the founder writes his three to five sentences in the admin
const FALLBACK_QUOTE =
  'Мы с лёгкостью доказываем, что недорогое жильё может и должно выглядеть не хуже, чем дорогие особняки. Строим только из качественных материалов, а сочетания фактур и цветов делают каждый наш дом по-настоящему своим.'

/**
 * Home v2, screen 2 «Кто строит» (27.10, Igor: «посмотрел дом — а кто это делает?»): the person behind the houses on a
 * real site, his words, three numbers. No photo yet — an honest frame says whose photo goes there.
 */
export function Founder({ f, facts, compact = false }: { f: FounderView; facts: Fact[]; compact?: boolean }) {
  return (
    <div className={`v2-founder ${compact ? 'v2-founder--compact' : ''}`}>
      <figure className="v2-founder__photo" data-reveal>
        {f.photo ? (
          <img src={f.photo} alt={f.name ? `${f.name} на объекте` : 'Основатель «Хорошего дома» на объекте'} loading="lazy" decoding="async" />
        ) : (
          <div className="v2-founder__empty">
            <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden>
              <path d="M4 8h3l2-2.5h6L17 8h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            <span>Здесь будет фото основателя на объекте</span>
          </div>
        )}
      </figure>
      <div className="v2-founder__text" data-reveal style={{ ['--d' as string]: '120ms' }}>
        <p className="eyebrow">Кто строит</p>
        <h2 className="title title--lg">
          Мы создаём не дома, а <em>образ жизни</em>
        </h2>
        <blockquote className="v2-founder__quote">
          <p>{f.quote || FALLBACK_QUOTE}</p>
          <footer>
            <b>{f.name || 'СК «Хороший дом»'}</b>
            {f.role && <span>{f.role}</span>}
          </footer>
        </blockquote>
        <dl className="v2-facts">
          {facts.map((x) => (
            <div key={x.label}>
              <dt>{x.value}</dt>
              <dd>{x.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
