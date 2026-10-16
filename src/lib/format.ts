// Pure helpers, safe in client components (no database imports here).

export const formatPrice = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
export const formatMillions = (n: number) => `${(n / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн ₽`
/** Area as Russians write it: 90,8 (not 90.8). */
export const formatArea = (n: number) => n.toLocaleString('ru-RU')
export const telHref = (phone?: string | null) => (phone ? `tel:+${phone.replace(/\D/g, '').replace(/^8/, '7')}` : undefined)

/**
 * Soft hyphens in long words (10+ letters), so a narrow chip breaks «Нововеличко-вская» with a hyphen instead of
 * cutting it anywhere: browsers on Windows have no Russian hyphenation dictionary for `hyphens: auto`.
 * Points as in Russian school rules: vowel|consonant+vowel («Но-во-ве») and vowel+consonant|consonant («лич-ков-ская»);
 * at least 2 letters on each side, the next part has a vowel and does not start with й/ь/ъ.
 */
export function softHyphens(text: string) {
  const V = /[аеёиоуыэюяaeiouy]/i
  const isV = (c?: string) => !!c && V.test(c)
  return text.replace(/[А-Яа-яЁёA-Za-z]{10,}/g, (w) => {
    let out = ''
    for (let i = 0; i < w.length; i++) {
      out += w[i]
      const rest = w.slice(i + 1)
      const ok = i >= 1 && rest.length >= 2 && V.test(rest) && !/^[йьъ]/i.test(rest)
      const openSyllable = isV(w[i]) && !isV(w[i + 1]) && isV(w[i + 2]) // о|во
      const betweenConsonants = !isV(w[i]) && isV(w[i - 1]) && !isV(w[i + 1]) // лич|ков
      const afterSign = /[ьъй]/i.test(w[i]) && !isV(w[i + 1]) // тель|ство
      if (ok && (openSyllable || betweenConsonants || afterSign)) out += '­'
    }
    return out
  })
}

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
