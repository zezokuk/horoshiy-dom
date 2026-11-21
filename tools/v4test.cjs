/* eslint-disable @typescript-eslint/no-require-imports -- Node-скрипт проверки (CommonJS): node tools/v4test.cjs [url] [папка-снимков] */
const { chromium } = require('playwright')
const fs = require('fs')

const BASE = process.argv[2] || 'http://127.0.0.1:3000'
const SHOTS = process.argv[3] || ''
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true })

const results = []
const ok = (name, pass, info = '') => results.push({ name, pass: !!pass, info })

async function scrollTo(page, sel, extra = 0) {
  const y = await page.evaluate(
    ([s, e]) => {
      const el = document.querySelector(s)
      return el ? el.getBoundingClientRect().top + scrollY + e : -1
    },
    [sel, extra],
  )
  if (y < 0) return false
  await page.evaluate((t) => window.scrollTo(0, t), y)
  await page.waitForTimeout(550)
  return true
}

async function run(browser, tag, opts) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 180)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|yandex|metrika|mc\.yandex|WebGL|THREE\.WebGLRenderer/i.test(m.text())) {
      errors.push(m.text().slice(0, 180))
    }
  })

  await page.goto(`${BASE}/v4`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(700)
  const mobile = !!opts.isMobile

  // 1. Первый экран: звезда раньше названия, нет слайдера, белый фон сайта
  const order = await page.evaluate(() => {
    const d = (el) => (el ? parseFloat(getComputedStyle(el).animationDelay) : NaN)
    return {
      star: d(document.querySelector('.hn__star')),
      name: d(document.querySelector('.v4-hero__title .v3-hero2__name > span')),
      navSlider: !!document.querySelector('.hn__nav'),
      bg: getComputedStyle(document.querySelector('.v3.v4')).backgroundColor,
    }
  })
  if (!opts.reducedMotion) ok(`${tag}: звезда раньше названия`, order.star < order.name, JSON.stringify(order))
  ok(`${tag}: автослайдер на первом экране убран`, !order.navSlider)
  ok(`${tag}: свежий светлый архитектурный фон`, order.bg === 'rgb(250, 249, 245)', order.bg)
  ok(`${tag}: нет горизонтальной прокрутки`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0)

  if (SHOTS && !opts.reducedMotion) {
    await page.waitForTimeout(2100)
    await page.screenshot({ path: `${SHOTS}/${tag}-01-hero.jpg`, quality: 75, type: 'jpeg' })
  }

  // 2. Единая сцена 1→2→3: 3D-дом («О нас» → «Наша команда» → въезд в дверь)
  const has3d = await page.locator('.v4-story3d').count()
  ok(`${tag}: единая 3D-сцена .v4-story3d присутствует`, has3d === 1)
  if (has3d && !opts.reducedMotion) {
    const bounds = await page.evaluate(() => {
      const el = document.querySelector('.v4-story3d')
      const top = el.getBoundingClientRect().top + scrollY
      const run = Math.max(1, el.offsetHeight - innerHeight)
      return { top, run }
    })
    await page.evaluate((y) => window.scrollTo(0, y), bounds.top + bounds.run * 0.21)
    await page.waitForTimeout(1350)
    const aboutVisible = await page.evaluate(() => document.querySelectorAll('.v4-story-card').length >= 4)
    ok(`${tag}: блок «О нас» в 3D-сцене`, aboutVisible)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-02-3d-about.jpg`, quality: 75, type: 'jpeg' })

    await page.evaluate((y) => window.scrollTo(0, y), bounds.top + bounds.run * 0.36)
    await page.waitForTimeout(1350)
    const foundersCount = await page.locator('.v4-founder-card').count()
    ok(`${tag}: 4 учредителя в 3D-сцене`, foundersCount === 4, `найдено ${foundersCount}`)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-03-3d-team.jpg`, quality: 75, type: 'jpeg' })

    await page.evaluate((y) => window.scrollTo(0, y), bounds.top + bounds.run * 0.485)
    await page.waitForTimeout(1350)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-03b-3d-door.jpg`, quality: 75, type: 'jpeg' })

    await page.evaluate((y) => window.scrollTo(0, y), bounds.top + bounds.run * 0.72)
    await page.waitForTimeout(1350)
  }

  // 3. Короткая пролётка «Внутри» с рассказом о компании + обязательная подпись
  const walkDisc = await page.locator('.v4-walk__disclaimer').textContent().catch(() => '')
  ok(`${tag}: подпись про 3D-тур и пример интерьера`, /3D-тур.*пример/i.test(walkDisc || ''))
  const hasBridge = await page.locator('.v4-bridge-sec').count()
  ok(`${tag}: лишний слайд «У каждого утра» убран`, hasBridge === 0)
  if (SHOTS && !opts.reducedMotion) await page.screenshot({ path: `${SHOTS}/${tag}-04-vnutri.jpg`, quality: 75, type: 'jpeg' })

  // 4. Типы готовых домов 1..12
  await scrollTo(page, '#tipy', -40)
  const typeBtns = await page.locator('.v4-ts__num').count()
  ok(`${tag}: витрина типов домов (12 кнопок)`, typeBtns === 12, `кнопок ${typeBtns}`)
  const tip5Btn = page.locator('.v4-ts__num', { hasText: /^5$/ })
  if (await tip5Btn.count()) {
    await tip5Btn.click()
    await page.waitForTimeout(250)
    const h3 = await page.locator('.v4-ts__top h3').textContent()
    ok(`${tag}: выбор типа переключает карточку`, /Тип 5/i.test(h3 || ''), h3 || '')
  }
  if (SHOTS && !opts.reducedMotion) await page.screenshot({ path: `${SHOTS}/${tag}-05-types.jpg`, quality: 75, type: 'jpeg' })

  // 5. Карта посёлков: без отдельных вкладок, клик по пину -> приближение + «Смотреть посёлок»
  await scrollTo(page, '#karta', -40)
  await page.waitForTimeout(600)
  ok(`${tag}: раздельные вкладки «Карта / Генплан» убраны`, (await page.locator('.v4-mflow__tabs').count()) === 0)

  const dinPin = page.locator('.v4-ypin', { hasText: /Динская/i }).first()
  await dinPin.waitFor({ state: 'visible', timeout: 7000 }).catch(() => {})
  if (await dinPin.isVisible().catch(() => false)) {
    const box = await dinPin.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    } else {
      await dinPin.click({ force: true })
    }
    await page.waitForTimeout(700)
    const hasReset = await page.locator('.v4-mflow__reset').isVisible().catch(() => false)
    const ctaHref = await page.locator('.v4-mflow__zoom-cta a[href="/v4/poselok/dinskaya"]').getAttribute('href').catch(() => '')
    ok(`${tag}: клик по пину приближает карту и показывает «Смотреть посёлок и генплан»`, hasReset && ctaHref === '/v4/poselok/dinskaya', `${hasReset} ${ctaHref}`)
    if (SHOTS && !opts.reducedMotion) await page.screenshot({ path: `${SHOTS}/${tag}-06-map-zoomed.jpg`, quality: 75, type: 'jpeg' })

    if (hasReset) {
      await page.locator('.v4-mflow__reset').click()
      await page.waitForTimeout(600)
      const krPin = page.locator('.v4-ypin', { hasText: /Красная 39/i }).first()
      const krBox = await krPin.boundingBox().catch(() => null)
      if (krBox) {
        await page.mouse.move(krBox.x + krBox.width / 2, krBox.y + krBox.height / 2)
        await page.mouse.click(krBox.x + krBox.width / 2, krBox.y + krBox.height / 2)
        await page.waitForTimeout(650)
        const krHref = await page.locator('.v4-mflow__zoom-cta a').getAttribute('href').catch(() => '')
        ok(`${tag}: для 1-домной локации «Красная 39» карта ведёт сразу в 3D-карточку дома`, /\/v4\/dom\//.test(krHref || ''), krHref || '')
      }
    }
  } else {
    ok(`${tag}: пин «Динская» виден на карте`, false)
  }

  // 6. Кнопка «Записаться на показ» ведёт к форме
  const btn = mobile ? page.locator('a[href="#evf-form"]:visible').last() : page.locator('.v4-bar__btn')
  await page.waitForTimeout(300)
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await page.waitForTimeout(600)
    const f = await page.evaluate(() => {
      const r = document.querySelector('#evf-form').getBoundingClientRect()
      return { top: Math.round(r.top), vh: innerHeight }
    })
    ok(`${tag}: кнопка показа ведёт к форме`, f.top >= -120 && f.top < f.vh * 0.85, JSON.stringify(f))
  } else {
    ok(`${tag}: кнопка показа в шапке видима`, false)
  }
  if (SHOTS && !opts.reducedMotion) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - innerHeight))
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${SHOTS}/${tag}-08-footer.jpg`, quality: 75, type: 'jpeg' })
  }

  // 7. Reduced motion проверка
  if (opts.reducedMotion) {
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.v4 h2, .v4-foot__word span, .v4-hero__title, .v4-founder-card')].filter((e) => {
        const s = getComputedStyle(e)
        return s.visibility === 'hidden' || s.opacity === '0'
      }).length,
    )
    ok(`${tag}: при «уменьшить движение» ничего не спрятано`, hidden === 0, `спрятано ${hidden}`)
  }

  // 8. Страница дома (Тип 5, уч. 18) — 3D сразу активна, сутки, 360°, солнце, 2x2 инфо, FAQ + форма
  const domRes = await page.goto(`${BASE}/v4/dom/di-18-tip5-v3`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(800)
  ok(`${tag}: /v4/dom/di-18-tip5-v3 открывается`, domRes && domRes.status() === 200)
  const domCheck = await page.evaluate(() => ({
    price: !!document.querySelector('.v4-dom__price'),
    sun: !!document.querySelector('.v4-sun'),
    info4: document.querySelectorAll('.v4-dom-icard').length === 4,
    faq: document.querySelectorAll('.v4-faq details').length > 0,
    form: !!document.querySelector('#evf-form'),
    noScrollX: document.documentElement.scrollWidth <= innerWidth,
  }))
  ok(`${tag}: страница дома содержит цену, солнце, 4 блока, FAQ и форму`, Object.values(domCheck).every(Boolean), JSON.stringify(domCheck))

  if (!opts.reducedMotion) {
    await page.locator('.v4-stage__daybar button', { hasText: /ночь/i }).click()
    await page.waitForTimeout(450)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-09-dom-night.jpg`, quality: 75, type: 'jpeg' })
    await page.locator('.v4-stage__modes button', { hasText: /360° внутри/i }).click()
    await page.waitForTimeout(300)
    ok(`${tag}: 360° тур открывается`, await page.locator('.v4-pano').isVisible())
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-10-dom-360.jpg`, quality: 75, type: 'jpeg' })
  }

  // 8b. Страница посёлка Динская: о посёлке + генплан 36 участков + список типов домов с картинками
  const dinRes = await page.goto(`${BASE}/v4/poselok/dinskaya`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(600)
  ok(`${tag}: /v4/poselok/dinskaya открывается`, dinRes && dinRes.status() === 200)
  ok(`${tag}: на странице Динской есть блок «Всё о посёлке»`, (await page.locator('#o-poselke').count()) === 1)
  await scrollTo(page, '#genplan', -40)
  const plots = await page.locator('.v4-gp__plot').count()
  ok(`${tag}: на странице Динской генплан 36 участков`, plots === 36, `участков ${plots}`)
  await page.locator('.v4-gp__plot[aria-label*="Участок 18"]').click()
  await page.waitForTimeout(350)
  const cardLink = await page.locator('.v4-gp__card a[href*="/v4/dom/"]').first().getAttribute('href').catch(() => '')
  ok(`${tag}: клик по участку 18 в Динской открывает карточку дома`, /\/v4\/dom\//.test(cardLink || ''), cardLink || '')
  if (SHOTS && !opts.reducedMotion) await page.screenshot({ path: `${SHOTS}/${tag}-07-dinskaya-genplan.jpg`, quality: 75, type: 'jpeg' })

  const typeCards = await page.locator('#tipy-poselka .v4-etype-card').count()
  ok(`${tag}: в Динской отображаются типы домов с картинками (>= 3)`, typeCards >= 3, `типов ${typeCards}`)
  if (SHOTS && !opts.reducedMotion) {
    await scrollTo(page, '#tipy-poselka', -40)
    await page.screenshot({ path: `${SHOTS}/${tag}-07b-dinskaya-types.jpg`, quality: 75, type: 'jpeg' })
  }

  // 8c. Страница локации с 1 домом (/v4/poselok/krasnaya-39): без псевдо-генплана, сразу карточка готового дома
  const krRes = await page.goto(`${BASE}/v4/poselok/krasnaya-39`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(400)
  ok(
    `${tag}: /v4/poselok/krasnaya-39 без псевдо-генплана и с карточкой дома`,
    krRes && krRes.status() === 200 && (await page.locator('#genplan').count()) === 0 && (await page.locator('#tipy-poselka .v4-etype-card').count()) >= 1,
  )

  // 9. Все остальные страницы многостраничного сайта
  for (const p of ['/v4/proekt/tip-5', '/v4/doma', '/v4/proekty', '/v4/poselki', '/v4/ipoteka', '/v4/o-kompanii', '/v4/kontakty']) {
    const r = await page.goto(`${BASE}${p}`, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(300)
    const st = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      form: !!document.querySelector('#evf-form'),
      x: document.documentElement.scrollWidth <= innerWidth,
    }))
    ok(`${tag}: ${p}`, r && r.status() === 200 && st.h1 === 1 && st.form && st.x, JSON.stringify(st))
  }

  if (mobile && SHOTS && !opts.reducedMotion) {
    await page.goto(`${BASE}/v4/doma`, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(300)
    await page.locator('.v4-mnav__burger').click()
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${SHOTS}/${tag}-11-mobile-menu.jpg`, quality: 75, type: 'jpeg' })
  }

  ok(`${tag}: нет ошибок в консоли`, errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
}

;(async () => {
  const browser = await chromium.launch()
  await run(browser, 'desktop', { viewport: { width: 1440, height: 900 } })
  await run(browser, 'mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await run(browser, 'reduced', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await browser.close()

  let fail = 0
  for (const r of results) {
    if (!r.pass) fail++
    console.log(`${r.pass ? 'OK  ' : 'FAIL'} ${r.name}${r.info ? ` (${r.info})` : ''}`)
  }
  console.log(`\n${results.length - fail}/${results.length} проверок прошло`)
  process.exit(fail ? 1 : 0)
})()
