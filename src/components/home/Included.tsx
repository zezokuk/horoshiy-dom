export type Program = { title: string; text?: string | null }

/**
 * Home v2, screen 7 «Что вы получаете и как купить»: what the price includes (the finishing list of the price list) and
 * the ways to pay. The calculator lives on /mortgage: a monthly payment needs the banks' rates (Igor, 27.10).
 */
export function Included({ finishing, programs, mortgageHref }: { finishing: string[]; programs: Program[]; mortgageHref: string }) {
  return (
    <div className="v2-included">
      <div className="v2-included__col" data-reveal>
        <p className="eyebrow">Что вы получаете</p>
        <h2 className="title title--md">Дом сдаём в предчистовой отделке</h2>
        <ul className="v2-checks">
          {finishing.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
      <div className="v2-included__col v2-included__col--buy" data-reveal style={{ ['--d' as string]: '120ms' }}>
        <p className="eyebrow">Как купить</p>
        <h2 className="title title--md">Ипотека, рассрочка или наличные</h2>
        <ul className="v2-programs">
          {programs.map((p) => (
            <li key={p.title}>
              <b>{p.title}</b>
              {p.text && <span>{p.text}</span>}
            </li>
          ))}
        </ul>
        <a className="btn btn--line" href={mortgageHref}>
          Посчитать платёж
        </a>
      </div>
    </div>
  )
}
