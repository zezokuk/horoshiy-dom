// Pure helpers, safe in client components (no database imports here).

export const formatPrice = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
export const formatMillions = (n: number) => `${(n / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн ₽`
/** Area as Russians write it: 90,8 (not 90.8). */
export const formatArea = (n: number) => n.toLocaleString('ru-RU')
export const telHref = (phone?: string | null) => (phone ? `tel:+${phone.replace(/\D/g, '').replace(/^8/, '7')}` : undefined)

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

/** Monthly annuity payment, rounded to roubles. Checked against the client's slide: 4 400 000 ₽, 6 %, 30 лет → 26 380 ₽. */
export function annuity(credit: number, ratePct: number, years: number) {
  const n = years * 12
  const r = ratePct / 100 / 12
  if (credit <= 0 || n <= 0) return 0
  return Math.round(r ? (credit * r) / (1 - Math.pow(1 + r, -n)) : credit / n)
}

export type HouseStatus = 'free' | 'reserved' | 'sold'
export const STATUS_LABEL: Record<HouseStatus, string> = { free: 'Свободен', reserved: 'Бронь', sold: 'Продан' }
