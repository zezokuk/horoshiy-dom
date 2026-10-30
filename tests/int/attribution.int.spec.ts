// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { captureAttribution, readAttribution } from '@/lib/attribution'

// the source lives in cookies, because an ad lands on the main site and the form is on krd.… (lib/sharedCookie)
const go = (url: string) => window.history.pushState({}, '', url)
const clear = () => document.cookie.split('; ').forEach((c) => (document.cookie = `${c.split('=')[0]}=; path=/; max-age=0`))

describe('attribution', () => {
  beforeEach(clear)

  it('keeps the ad and the first page while the visitor walks on', () => {
    go('/?utm_source=yandex&utm_campaign=spring')
    captureAttribution()
    go('/houses/di-tip1-v2')
    captureAttribution()
    const a = readAttribution()
    expect(a.utm).toEqual({ utm_source: 'yandex', utm_campaign: 'spring' })
    expect(a.landing).toContain('utm_source=yandex')
  })

  it('a new ad click within the visit overrides the source', () => {
    go('/?utm_source=yandex')
    captureAttribution()
    go('/catalog?utm_source=vk')
    captureAttribution()
    expect(readAttribution().utm).toEqual({ utm_source: 'vk' })
  })

  it('a direct visit has no source', () => {
    go('/')
    captureAttribution()
    expect(readAttribution().utm).toEqual({})
  })

  it('tags too long for a cookie are dropped, nothing breaks', () => {
    go(`/?utm_source=${'x'.repeat(5000)}`)
    captureAttribution()
    expect(readAttribution().utm).toEqual({})
  })
})
