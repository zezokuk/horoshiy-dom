/**
 * Reference «Skylon» (20.10), the «key» metaphor: a photo of a ready house cut in the shape of a door hanger, hung on
 * a gold door handle. The shape is an SVG clip path in the card's own units (a dome, a hole for the handle, a slot
 * to the edge); the handle's rosette sits in the hole, the lever goes out to the right.
 */
export function KeyHanger({ photo, alt }: { photo?: string; alt: string }) {
  return (
    <figure className="key">
      <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="key-shape" clipPathUnits="objectBoundingBox">
            <path
              clipRule="evenodd"
              d="M0 .3A.5 .3 0 0 1 1 .3V.95Q1 1 .94 1H.06Q0 1 0 .95Z M.33 .17A.17 .102 0 1 0 .67 .17A.17 .102 0 1 0 .33 .17Z M0 .205L.333 .19L.345 .212L0 .235Z"
            />
          </clipPath>
        </defs>
      </svg>
      <div className="key__card">{photo && <img src={photo} alt={alt} loading="lazy" decoding="async" />}</div>
      <svg className="key__handle" viewBox="0 0 320 120" aria-hidden>
        <path className="key__lever" d="M60 44C140 40 240 44 296 52a11 11 0 0 1 0 22C240 82 140 80 60 78Z" />
        <path className="key__shine" d="M84 51C150 48 228 51 288 57" />
        <circle className="key__rose" cx="60" cy="60" r="38" />
        <circle className="key__rose-in" cx="60" cy="60" r="27" />
      </svg>
    </figure>
  )
}
