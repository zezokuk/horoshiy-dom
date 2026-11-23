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

  // Первый экран ведёт к предложению конкретного дома.
  const home = await page.evaluate(() => ({
    hasDawn: getComputedStyle(document.querySelector('.buyer-hero__night')).animationName.includes('buyer-dawn'),
    hasStar: getComputedStyle(document.querySelector('.buyer-hero__stars i')).animationName.includes('buyer-star'),
    next: document.querySelector('.buyer-hero').nextElementSibling?.id,
    bg: getComputedStyle(document.querySelector('.v3.v4')).backgroundColor,
    fits: document.documentElement.scrollWidth <= innerWidth,
  }))
  if (!opts.reducedMotion) ok(`${tag}: на первом экране звезда и рассвет`, home.hasDawn && home.hasStar)
  ok(`${tag}: после первого экрана сразу дома`, home.next === 'doma')
  ok(`${tag}: светлый фон и нет горизонтальной прокрутки`, home.bg === 'rgb(250, 249, 245)' && home.fits)
  if (SHOTS && !opts.reducedMotion) await page.screenshot({ path: `${SHOTS}/${tag}-01-hero.jpg`, quality: 75 })
  await page.locator('.buyer-hero__action').click()
  ok(`${tag}: «Выбрать дом» ведёт к витрине`, new URL(page.url()).hash === '#doma')
  const openHouse = page.locator('.fh-open')
  const firstHouse = await openHouse.getAttribute('href')
  const nextHouse = page.locator('.fh-switch button').last()
  if (await nextHouse.count()) {
    await nextHouse.click()
    ok(`${tag}: переключатель выбирает другой дом`, firstHouse !== await openHouse.getAttribute('href'))
    await page.locator('.fh-switch button').first().click()
  }
  ok(`${tag}: фото и кнопка открывают один дом`, firstHouse.startsWith('/v4/dom/') && await page.locator('.fh-photo').getAttribute('href') === firstHouse)
  ok(`${tag}: у кадра есть подпись, у дома цена`, !!(await page.locator('.fh-source').textContent()) && (await page.locator('.fh-price').innerText()).includes('₽'))
  if (SHOTS && !opts.reducedMotion) await page.screenshot({ path: `${SHOTS}/${tag}-02-featured.jpg`, quality: 75 })

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
        ok(`${tag}: для 1-домной локации «Красная 39» карта ведёт сразу в карточку дома`, /\/v4\/dom\//.test(krHref || ''), krHref || '')
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
      [...document.querySelectorAll('.v4 h2, .v4-foot__word span, .buyer-hero__title, .fh-facts')].filter((e) => {
        const s = getComputedStyle(e)
        return s.visibility === 'hidden' || s.opacity === '0'
      }).length,
    )
    ok(`${tag}: при «уменьшить движение» ничего не спрятано`, hidden === 0, `спрятано ${hidden}`)
  }

  // Покупатель открывает тот же объект, который выбрал на главной.
  await openHouse.click()
  await page.waitForURL(`**${firstHouse}`)
  const house = await page.evaluate(() => ({
    price: document.querySelector('.hd-price')?.textContent.includes('₽'),
    plan: !!document.querySelector('#plan img'),
    mortgage: !!document.querySelector('#ipoteka .v4-mort'),
    form: !!document.querySelector('#evf-form form'),
    noScrollX: document.documentElement.scrollWidth <= innerWidth,
  }))
  ok(`${tag}: у дома есть цена, планировка, расчёт ипотеки и форма`, Object.values(house).every(Boolean), JSON.stringify(house))
  const frame = page.locator('.hd-gallery-stage > img')
  const firstSrc = await frame.getAttribute('src')
  await page.getByRole('button', { name: 'Следующий кадр' }).click()
  ok(`${tag}: галерея переключает снимок`, firstSrc !== await frame.getAttribute('src'))
  await page.getByRole('button', { name: 'Развернуть изображение' }).click()
  ok(`${tag}: галерея открывается на весь экран`, await page.locator('.hd-lightbox[open]').isVisible())
  await page.getByRole('button', { name: 'Закрыть галерею' }).click()
  if (SHOTS && !opts.reducedMotion) await page.screenshot({ path: `${SHOTS}/${tag}-09-house.jpg`, quality: 75 })
  await page.locator('.hd-visit').click()
  ok(`${tag}: из дома можно записаться на показ`, new URL(page.url()).hash === '#evf-form' && await page.locator('#evf-form input[name="phone"]').isVisible())

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
