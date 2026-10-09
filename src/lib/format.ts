// Pure helpers, safe in client components (no database imports here).

export const formatPrice = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
export const formatMillions = (n: number) => `${(n / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн ₽`
export const telHref = (phone?: string | null) => (phone ? `tel:+${phone.replace(/\D/g, '').replace(/^8/, '7')}` : undefined)

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export type HouseStatus = 'free' | 'reserved' | 'sold'
export const STATUS_LABEL: Record<HouseStatus, string> = { free: 'Свободен', reserved: 'Бронь', sold: 'Продан' }
