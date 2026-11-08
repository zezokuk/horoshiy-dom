/**
 * «Люди уже живут в них» (Igor's vision, screen 7, 08.11): two or three real stories of the residents after the facts about
 * the company. Until the client sends them (photo, the family's words, the estate) every card is an honest frame that says
 * what goes there — nothing is made up (rule of the night 09→10.11: gaps stay «___»).
 */
export function Residents({ count = 3 }: { count?: number }) {
  return (
    <div className="v2-residents">
      <p className="v2-residents__head">
        <b>Жильцы о своих домах</b>
        <span>Истории и фото семей — ждём от застройщика. Не выдумываем.</span>
      </p>
      <ul className="v2-residents__list">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="v2-resident" data-reveal style={{ ['--d' as string]: `${i * 90}ms` }}>
            <span className="v2-resident__photo" aria-hidden>
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path d="M4 8h3l2-2.5h6L17 8h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="v2-resident__quote">«___»</span>
            <span className="v2-resident__who">Семья ___ · посёлок ___ · живут с ___</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
