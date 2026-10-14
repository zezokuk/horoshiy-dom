import { describe, expect, it } from 'vitest'
import { leadSource } from '@/lib/leadSource'

const OWN = 'horoshiy-dom.ru'

describe('leadSource', () => {
  it('ads by UTM, with medium and campaign', () => {
    expect(leadSource({ utm_source: 'yandex', utm_medium: 'cpc', utm_campaign: 'dinskaya' }, '', OWN)).toBe('Реклама: yandex (cpc / dinskaya)')
    expect(leadSource({ utm_source: 'vk' }, 'https://vk.com/', OWN)).toBe('Реклама: vk')
  })
  it('ads by click id when there are no UTM tags', () => {
    expect(leadSource({ yclid: '123' }, '', OWN)).toBe('Реклама: Яндекс Директ')
    expect(leadSource({ gclid: 'x' }, '', OWN)).toBe('Реклама: Google Ads')
  })
  it('search engines and other sites by the referrer', () => {
    expect(leadSource({}, 'https://yandex.ru/search/?text=дом', OWN)).toBe('Поиск Яндекса')
    expect(leadSource({}, 'https://ya.ru/', OWN)).toBe('Поиск Яндекса')
    expect(leadSource({}, 'https://www.google.com/', OWN)).toBe('Поиск Google')
    expect(leadSource({}, 'https://www.avito.ru/krasnodar', OWN)).toBe('Переход с avito.ru')
  })
  it('our own subdomains and no referrer are a direct visit', () => {
    expect(leadSource({}, '', OWN)).toBe('Прямой заход')
    expect(leadSource({}, 'https://krd.horoshiy-dom.ru/objects/dinskaya', OWN)).toBe('Прямой заход')
    expect(leadSource({}, 'not a url', OWN)).toBe('Прямой заход')
  })
})
