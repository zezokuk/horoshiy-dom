export type HomeWay = {
  n: string
  href: string
  kind: 'photo' | 'plan'
  photo?: string
  plan?: string
  planNote?: string
  alt: string
  kicker: string
  title: string
  accent: string
  text: string
  go: string
  meta: string
}

const STAGES = ['План', 'Фундамент', 'Стены', 'Крыша']

export function HomeWays({ ways }: { ways: HomeWay[] }) {
  return (
    <section className="home-ways" id="choose" aria-label="Готовый дом или строительство">
      {ways.map((w, i) => (
        <a
          key={w.n}
          href={w.href}
          className={`home-ways__item home-ways__item--${w.kind}`}
          data-reveal
          style={{ ['--d' as string]: `${i * 120}ms` }}
        >
          {w.kind === 'photo' && w.photo && (
            <img src={w.photo} alt={w.alt} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
          )}
          {w.kind === 'plan' && (
            <div className="home-ways__blueprint">
              <img
                className={`home-ways__plan ${w.plan?.includes('-lines.webp') ? 'home-ways__plan--lines' : ''}`}
                src={w.plan ?? '/design/plan-tip5-lines.webp'}
                alt={w.alt}
                loading="lazy"
                decoding="async"
              />
              {w.planNote && <span className="home-ways__plan-note">{w.planNote}</span>}
              <ul className="home-ways__stages" aria-label="Этапы строительства">
                {STAGES.map((stage, index) => (
                  <li key={stage}>
                    <span>0{index + 1}</span>
                    {stage}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <span className="home-ways__shade" aria-hidden />
          <span className="home-ways__top">
            <span>{w.n}</span>
            <span>{w.kicker}</span>
          </span>
          <span className="home-ways__body">
            <h2>
              {w.title} <em>{w.accent}</em>
            </h2>
            <p>{w.text}</p>
          </span>
          <span className="home-ways__bottom">
            <span>
              <b>{w.go}</b>
              <small>{w.meta}</small>
            </span>
            <i aria-hidden>↗</i>
          </span>
        </a>
      ))}
    </section>
  )
}
