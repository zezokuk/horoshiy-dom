import { afterEach, describe, expect, it, vi } from 'vitest'
import { leadSource } from '@/lib/leadSource'

// хорошийдом.рф in punycode: what browsers send in the Host header and the referrer
const PUNY = 'xn--d1ahdngadl7b7a.xn--p1ai'

async function siteWith(root: string) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', root)
  vi.stubEnv('NEXT_PUBLIC_REGION_MODE', 'subdomain')
  return import('@/lib/site')
}

afterEach(() => vi.unstubAllEnvs())

describe('a Cyrillic domain (хорошийдом.рф)', () => {
  it.each(['хорошийдом.рф', 'ХорошийДом.РФ', PUNY])('written as «%s» in .env works the same', async (root) => {
    const site = await siteWith(root)
    expect(site.ROOT_DOMAIN).toBe(PUNY)
    expect(site.PROTOCOL).toBe('https')
    expect(site.MAIN_URL).toBe(`https://${PUNY}`)
    // region subdomains: the Host header comes in punycode
    expect(site.regionFromHost(`krd.${PUNY}`)).toBe('krd')
    expect(site.regionFromHost(`www.${PUNY}`)).toBe(null)
    expect(site.regionFromHost(PUNY)).toBe(null)
    // links, sitemap and robots are built from these: ASCII only
    expect(site.regionHref('krd', '/catalog')).toBe(`https://krd.${PUNY}/catalog`)
    expect(site.mainHref('/build')).toBe(`https://${PUNY}/build`)
  })

  it('a visit from our own subdomain is not «another site» in the lead source', async () => {
    const site = await siteWith('хорошийдом.рф')
    expect(leadSource({}, `https://krd.${PUNY}/objects/dinskaya`, site.ROOT_DOMAIN)).toBe('Прямой заход')
    expect(leadSource({}, 'https://www.avito.ru/', site.ROOT_DOMAIN)).toBe('Переход с avito.ru')
  })

  it('local development hosts stay as they are', async () => {
    const site = await siteWith('horoshiy.localhost:3000')
    expect(site.ROOT_DOMAIN).toBe('horoshiy.localhost:3000')
    expect(site.PROTOCOL).toBe('http')
    expect(site.regionFromHost('krd.horoshiy.localhost:3000')).toBe('krd')
  })
})
