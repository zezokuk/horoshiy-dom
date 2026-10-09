import { telHref } from '@/lib/format'

/** Mobile-only bottom bar: most ad traffic is mobile, so call and form are always one tap away. */
export function StickyCta({ phone }: { phone?: string | null }) {
  return (
    <div className="sticky-cta">
      {phone && (
        <a href={telHref(phone)} className="btn btn--green">
          Позвонить
        </a>
      )}
      <a href="#lead" className="btn btn--gold">
        Подобрать дом
      </a>
    </div>
  )
}
