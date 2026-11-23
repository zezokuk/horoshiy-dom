/* eslint-disable @typescript-eslint/no-require-imports -- Запуск через Node.js (CommonJS). */
// node tools/v4walktest.cjs [адрес сайта] [папка для снимков и роликов]
// Для H.264 используем установленный Chrome (в Windows — Edge). Канал можно задать в PLAYWRIGHT_CHANNEL.
const { chromium, expect } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

const base = process.argv[2] || 'http://horoshiy.localhost:3000'
const url = new URL('/v4', base).href
const out = process.argv[3]
const phone = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
const chapters = ['Крыльцо', 'Холл', 'Кухня-гостиная', 'Терраса']

async function screenshot(page, name) {
  if (out) await page.screenshot({ path: path.join(out, name + '.jpg'), quality: 82 })
}

async function testWalk(browser, name, options) {
  const ctx = await browser.newContext({
    ...options,
    ...(out && { recordVideo: { dir: out, size: options.viewport } }),
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', msg => {
    if (msg.type() === 'error' && !/favicon|yandex|metrika/i.test(msg.text())) errors.push(msg.text())
  })
  const scene = page.locator('#vnutri')
  const video = scene.locator('video')
  const play = scene.getByRole('button', { name: 'Воспроизвести прогулку' })
  const pause = scene.getByRole('button', { name: 'Пауза' })
  const locationInFilm = () => video.evaluate(v => v.currentTime)
  const decodedFrames = () => video.evaluate(v => v.getVideoPlaybackQuality().totalVideoFrames)
  const enter = () => scene.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))

  try {
    await ctx.addCookies([{ name: 'hd_cookie_ok', value: '1', url: new URL(url).origin }])
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#doma + #vnutri')).toHaveCount(1)
    await enter()
    await expect(scene.getByRole('navigation', { name: 'Главы прогулки' }).getByRole('button')).toHaveCount(chapters.length)

    if (options.reducedMotion === 'reduce') {
      await expect(play).toBeVisible()
      await expect(scene.locator('picture img')).toBeVisible()
      await expect(video).not.toHaveAttribute('src', /.+/)
      await expect(video).toHaveJSProperty('paused', true)
      await screenshot(page, name + '-poster')
      await scene.getByRole('button', { name: 'Холл', exact: true }).click()
      await expect(scene.getByRole('heading', { name: 'Холл' })).toBeVisible()
      await expect(video).not.toHaveAttribute('src', /.+/)
      await play.click()
    }

    await expect(pause).toBeVisible({ timeout: 15000 })
    const startTime = await locationInFilm()
    const startFrame = await decodedFrames()
    await expect.poll(locationInFilm).toBeGreaterThan(startTime + 0.5)
    await expect.poll(decodedFrames).toBeGreaterThan(startFrame + 4)
    expect(await video.evaluate(v => v.videoHeight > v.videoWidth)).toBe(Boolean(options.isMobile))
    await screenshot(page, name + '-entry')

    await pause.click()
    await expect(video).toHaveJSProperty('paused', true)
    const pausedFrame = await locationInFilm()
    await page.waitForTimeout(300)
    expect(await locationInFilm()).toBeCloseTo(pausedFrame, 2)

    let lastTime = -1
    for (const chapter of chapters) {
      const button = scene.getByRole('button', { name: chapter, exact: true })
      await button.click()
      await expect(button).toHaveAttribute('aria-current', 'step')
      await expect(video).toHaveJSProperty('seeking', false)
      const time = await locationInFilm()
      expect(time).toBeGreaterThan(lastTime)
      lastTime = time
      if (chapter === 'Кухня-гостиная') await screenshot(page, name + '-kitchen')
    }
    if (options.isMobile && options.reducedMotion !== 'reduce') {
      await page.setViewportSize({ width: 844, height: 390 })
      await expect.poll(() => video.evaluate(v => v.videoWidth > v.videoHeight && v.readyState >= 2)).toBe(true)
      await expect.poll(locationInFilm).toBeCloseTo(lastTime, 1)
      await expect(video).toHaveJSProperty('paused', true)
      await page.setViewportSize(options.viewport)
      await expect.poll(() => video.evaluate(v => v.videoWidth < v.videoHeight && v.readyState >= 2)).toBe(true)
      await expect.poll(locationInFilm).toBeCloseTo(lastTime, 1)
      await enter()
    }
    await play.click()
    await expect.poll(() => video.evaluate(v => v.ended), { timeout: 10000 }).toBe(true)
    await play.click()
    await expect(scene.getByRole('button', { name: chapters[0], exact: true })).toHaveAttribute('aria-current', 'step')

    await page.locator('h1').evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
    await expect(video).toHaveJSProperty('paused', true)
    await enter()
    if (options.reducedMotion !== 'reduce') await expect(pause).toBeVisible()
    const house = scene.locator('a[href]').first()
    const destination = new URL(await house.getAttribute('href'), url)
    await house.click()
    await page.waitForURL(destination.href)
    await expect(page.locator('h1')).toBeVisible()
    expect(errors).toEqual([])
    console.log('OK', name, '— видео, главы, пауза, повтор, переход в карточку')
  } catch (error) {
    await screenshot(page, name + '-failed').catch(() => {})
    throw new Error(name + ': ' + error.message, { cause: error })
  } finally {
    const recording = page.video()
    await ctx.close()
    if (out && recording) fs.renameSync(await recording.path(), path.join(out, 'walk-' + name + '.webm'))
  }
}

async function main() {
  if (out) fs.mkdirSync(out, { recursive: true })
  const channel = process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chrome')
  const browser = await chromium.launch({ channel })
  try {
    await testWalk(browser, 'desktop', { viewport: { width: 1440, height: 900 } })
    await testWalk(browser, 'phone', phone)
    await testWalk(browser, 'reduced', { ...phone, reducedMotion: 'reduce' })
  } finally {
    await browser.close()
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
