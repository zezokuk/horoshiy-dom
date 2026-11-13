/* eslint-disable @typescript-eslint/no-require-imports -- обычный Node-скрипт (CommonJS), запускается node tools/v4test.cjs */
// Браузерная проверка главной v4 (и страницы дома v4, если она есть): компьютер 1440 и телефон 390, плюс «уменьшить движение».
// Запуск: node tools/v4test.cjs [адрес сайта] [папка для снимков]
//   по умолчанию http://horoshiy.localhost:3000 и без снимков. Код выхода 1 — если хоть одна проверка не прошла.
// Проверяет: нет ошибок в консоли, нет горизонтальной прокрутки, кнопки ведут к форме, 12 строк в «Домах по типам»,
// плашка на карте меняет зелёную карточку, порядок первого экрана (звезда раньше названия), при reduced motion ничего не спрятано.
const { chromium } = require('playwright')

const BASE = process.argv[2] || 'http://horoshiy.localhost:3000'
const SHOTS = process.argv[3] || ''
const results = []
const ok = (name, pass, info = '') => results.push({ name, pass: !!pass, info })

async function scrollTo(page, sel, extra = 0) {
  const y = await page.evaluate(([s, e]) => {
    const el = document.querySelector(s)
    return el ? el.getBoundingClientRect().top + scrollY + e : -1
  }, [sel, extra])
  if (y < 0) return false
  const from = await page.evaluate(() => scrollY)
  for (let k = 1; k <= 8; k++) {
    await page.evaluate((t) => scrollTo(0, t), from + ((y - from) * k) / 8)
    await page.waitForTimeout(80)
  }
  await page.waitForTimeout(700)
  return true
}

async function run(browser, tag, opts) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && !/favicon|yandex|metrika|mc\.yandex/i.test(m.text()) && errors.push(m.text().slice(0, 160)))
  await page.goto(`${BASE}/v4`, { waitUntil: 'networkidle', timeout: 120000 })
  const mobile = !!opts.isMobile

  // первый экран: звезда стартует раньше названия
  const order = await page.evaluate(() => {
    const d = (el) => (el ? parseFloat(getComputedStyle(el).animationDelay) : NaN)
    return { star: d(document.querySelector('.hn__star')), name: d(document.querySelector('.v4-hero__title .v3-hero2__name > span')) }
  })
  if (!opts.reducedMotion) ok(`${tag}: звезда раньше названия`, order.star < order.name, JSON.stringify(order))

  ok(`${tag}: нет горизонтальной прокрутки`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0)

  // типы
  await scrollTo(page, '#tipy')
  const rows = await page.locator('.v4-types__list a').count()
  ok(`${tag}: в «Домах по типам» 12 строк`, rows === 12, `строк ${rows}`)
  const typeLinks = await page.evaluate(() => [...document.querySelectorAll('.v4-types__list a')].every((a) => /\/v4\/proekt\//.test(a.getAttribute('href') || '')))
  ok(`${tag}: строки типов ведут на страницы типов`, typeLinks)

  // карта: плашка меняет карточку
  await scrollTo(page, '.v4-mapbox', -90)
  await page.waitForTimeout(4000)
  const before = await page.evaluate(() => document.querySelector('.v4-map__name h3')?.textContent)
  await page.locator('.v4-plaque').nth(1).click()
  await page.waitForTimeout(1500)
  const after = await page.evaluate(() => document.querySelector('.v4-map__name h3')?.textContent)
  ok(`${tag}: плашка карты меняет карточку`, before && after && before !== after, `${before} → ${after}`)

  // кнопка «Записаться на показ» ведёт к форме
  await page.evaluate(() => scrollTo(0, innerHeight * 3))
  await page.waitForTimeout(900)
  const btn = mobile ? page.locator('a[href="#evf-form"]:visible').last() : page.locator('.v4-bar__btn')
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await page.waitForTimeout(2600)
    const f = await page.evaluate(() => {
      const r = document.querySelector('#evf-form').getBoundingClientRect()
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight }
    })
    ok(`${tag}: кнопка показа ведёт к форме`, f.top >= 0 && f.top < f.vh * 0.6, JSON.stringify(f))
  } else ok(`${tag}: кнопка показа видна`, false)

  // reduced motion: ничего важного не спрятано
  if (opts.reducedMotion) {
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.v4 h2, .v4-nums__row b, .v4-foot__word span, .v4-grow__quote, .v4-hero__title')].filter((e) => {
        const s = getComputedStyle(e)
        return s.visibility === 'hidden' || s.opacity === '0'
      }).length,
    )
    ok(`${tag}: при «уменьшить движение» ничего не спрятано`, hidden === 0, `спрятано ${hidden}`)
  }

  // страница дома v4, если есть ссылка на неё
  const domHref = await page.evaluate(() => document.querySelector('a[href*="/v4/dom/"]')?.getAttribute('href'))
  if (domHref) {
    const r = await page.goto(new URL(domHref, BASE).href, { waitUntil: 'networkidle', timeout: 120000 })
    ok(`${tag}: страница дома v4 открывается`, r && r.status() === 200, domHref)
    ok(`${tag}: на странице дома есть цена и форма`, await page.evaluate(() => !!document.querySelector('.v4-dom__price') && !!document.querySelector('#evf-form')))
    ok(`${tag}: на странице дома нет горизонтальной прокрутки`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/v4test-${tag}-dom.jpg`, quality: 65, type: 'jpeg', fullPage: false })
  }

  for (const path of ['/v4/poselok/dinskaya', '/v4/proekt/tip-5', '/v4/doma', '/v4/proekty', '/v4/poselki', '/v4/ipoteka', '/v4/o-kompanii', '/v4/kontakty']) {
    const r2 = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 120000 })
    ok(`${tag}: ${path} открывается`, r2 && r2.status() === 200)
    ok(`${tag}: ${path} — один H1 и форма, без прокрутки вбок`, await page.evaluate(() => document.querySelectorAll('h1').length === 1 && !!document.querySelector('#evf-form') && document.documentElement.scrollWidth <= innerWidth))
  }
  ok(`${tag}: нет ошибок в консоли`, errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
}

;(async () => {
  const browser = await chromium.launch()
  await run(browser, 'компьютер', { viewport: { width: 1440, height: 900 } })
  await run(browser, 'телефон', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await run(browser, 'reduced', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await browser.close()
  let fail = 0
  for (const r of results) {
    if (!r.pass) fail++
    console.log(`${r.pass ? 'OK  ' : 'FAIL'} ${r.name}${r.info ? `  (${r.info})` : ''}`)
  }
  console.log(`\n${results.length - fail}/${results.length} проверок прошло`)
  process.exit(fail ? 1 : 0)
})()
