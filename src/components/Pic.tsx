/**
 * A big first-screen photo: phones get the 640 px copy (≈50 KB), computers the 1600 px one (≈300 KB).
 * Measured 19.10 (tools/perfcheck.py): the 1600 px hero on a phone was 314 KB of 709 on the home page.
 * `picture` has display: contents (globals.css), so CSS written for the <img> keeps working.
 */
export function Pic({ src, phone, alt, priority = false }: { src: string; phone?: string; alt: string; priority?: boolean }) {
  return (
    <picture>
      {phone && phone !== src && <source media="(max-width: 959px)" srcSet={phone} />}
      <img src={src} alt={alt} fetchPriority={priority ? 'high' : undefined} decoding="async" />
    </picture>
  )
}
