import { describe, expect, it } from 'vitest'
import { annuity, softHyphens } from '@/lib/format'

describe('softHyphens', () => {
  const show = (s: string) => softHyphens(s).replace(/­/g, '-')
  it('long words get break points by syllables, never before й/ь/ъ', () => {
    expect(show('Нововеличковская')).toBe('Но-во-ве-лич-ков-ская')
    expect(show('Краснодарский')).toBe('Крас-но-дар-ский')
    expect(show('Строительство')).toBe('Стро-и-тель-ство'.replace('о-и', 'ои'))
  })
  it('short words and spaces stay as they are', () => {
    expect(softHyphens('Южный ветер')).toBe('Южный ветер')
    expect(softHyphens('Москва и область')).toBe('Москва и область')
  })
})

// Numbers from the client's house slide (медиамои/photo_…658): «Тип 12», 8 900 000 ₽, семейная ипотека 6 %, 30 лет.
describe('annuity', () => {
  it('matches the slide: 1 child — credit 4 400 000 ₽ → ≈ 26 380 ₽', () => {
    expect(annuity(4_400_000, 6, 30)).toBe(26_380)
  })
  it('matches the slide: 2 children — credit 6 789 500 ₽ → ≈ 40 706 ₽', () => {
    expect(annuity(6_789_500, 6, 30)).toBe(40_706)
  })
  it('zero rate and empty credit', () => {
    expect(annuity(3_600_000, 0, 30)).toBe(10_000)
    expect(annuity(0, 6, 30)).toBe(0)
  })
})
