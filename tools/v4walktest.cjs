/* eslint-disable @typescript-eslint/no-require-imports -- обычный Node-скрипт (CommonJS), запускается node tools/v4walktest.cjs */
// Проверка прогулки «Внутри» на главной v4 (15.11.2026): компьютер 1440×900 и телефон 390×844, браузер Edge (в нём есть H.264).
// Запуск: node tools/v4walktest.cjs [адрес сайта] [папка для снимков и роликов]
//   по умолчанию http://horoshiy.localhost:3000 и без снимков. Код выхода 1 — если хоть одна проверка не прошла.
// Проверяет: нет ошибок в консоли; видео (если есть) идёт только вперёд и доходит до конца; подписи комнат идут по порядку
// и последняя (терраса) видна в конце; после видео, если клипов меньше, чем комнат, проявляются кадры.
// С папкой: 12 снимков по ходу прогулки на каждое устройство и ролик прокрутки walk-<устройство>.webm.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.argv[2] || 'http://horoshiy.localhost:3000'
const OUT = process.argv[3] || ''
const results = []
const ok = (name, pass, info = '') => results.push({ name, pass: !!pass, info })

async function run(browser, tag, opts) {
  const ctx = await browser.newContext({ ...opts, ...(OUT ? { recordVideo: { dir: OUT, size: opts.viewport } } : {}) })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && !/favicon|yandex|metrika|mc\.yandex/i.test(m.text()) && errors.push(m.text().slice(0, 160)))
  await page.goto(`${BASE}/v4`, { waitUntil: 'networkidle', timeout: 120000 })

  const sec = await page.evaluate(() => {
    const s = document.querySelector('#vnutri')
    if (!s) return null
    const r = s.getBoundingClientRect()
    return { top: r.top + scrollY, h: s.offsetHeight, vh: innerHeight,
      rooms: [...s.querySelectorAll('.v4-walk__card h3')].map((h) => h.childNodes[0].textContent.trim()),
      video: !!s.querySelector('.v4-walk__video'), tail: s.querySelectorAll('.v4-fly[data-tail]').length }
  })
  ok(`${tag}: раздел «Внутри» есть`, sec, sec ? `${Math.round(sec.h / sec.vh * 100)}vh, комнаты: ${sec.rooms.join(' → ')}${sec.video ? ', видео' : ''}${sec.tail ? `, кадров после видео: ${sec.tail}` : ''}` : '')
  if (!sec) { await ctx.close(); return }

  // проматываем раздел мелкими шагами, как пальцем/колесом; на каждом шаге — секунда видео и видимая подпись
  const steps = 120
  const span = sec.h - sec.vh
  const log = []
  await page.evaluate((y) => scrollTo(0, y), sec.top - sec.vh)
  await page.waitForTimeout(400)
  for (let k = 0; k <= steps; k++) {
    await page.evaluate((y) => scrollTo(0, y), sec.top + (span * k) / steps)
    await page.waitForTimeout(110)
    const st = await page.evaluate(() => {
      const s = document.querySelector('#vnutri')
      const v = s.querySelector('.v4-walk__video')
      const card = [...s.querySelectorAll('.v4-walk__card')].find((c) => parseFloat(getComputedStyle(c).opacity) > 0.5)
      const tailOn = [...s.querySelectorAll('.v4-fly[data-tail]')].filter((f) => parseFloat(getComputedStyle(f).opacity) > 0.5).length
      return { t: v ? v.currentTime : null, ready: v ? v.readyState : null, vOn: v ? parseFloat(getComputedStyle(v).opacity) > 0.5 : false,
        card: card ? card.querySelector('h3').childNodes[0].textContent.trim() : '', tailOn }
    })
    log.push(st)
    if (OUT && k % 10 === 0) await page.screenshot({ path: path.join(OUT, `${tag}-${String(k).padStart(3, '0')}.jpg`), quality: 70 })
  }
  await page.waitForTimeout(600)

  if (sec.video) {
    const ts = log.filter((s) => s.vOn).map((s) => s.t)
    const back = ts.filter((t, i) => i && t < ts[i - 1] - 0.05).length
    const max = Math.max(0, ...ts)
    ok(`${tag}: видео загрузилось`, log.some((s) => s.ready >= 2), `readyState до ${Math.max(...log.map((s) => s.ready || 0))}`)
    ok(`${tag}: видео идёт только вперёд`, back === 0, `откатов: ${back}`)
    ok(`${tag}: видео доходит до конца`, max > 0, `до ${max.toFixed(1)} с`)
  }
  const seq = log.map((s) => s.card).filter((c, i, a) => c && c !== a[i - 1])
  ok(`${tag}: подписи по порядку`, JSON.stringify(seq) === JSON.stringify(sec.rooms), seq.join(' → ') || 'подписей не видно')
  ok(`${tag}: в конце видна последняя комната`, log[log.length - 1].card === sec.rooms[sec.rooms.length - 1], log[log.length - 1].card || '—')
  ok(`${tag}: прогулка доходит до террасы`, sec.rooms[sec.rooms.length - 1] === 'Терраса', sec.rooms[sec.rooms.length - 1] || '—')
  if (sec.video) {
    // подпись второй комнаты должна смениться, пока видео ещё идёт (камера прошла порог), а не после него
    const i = log.findIndex((s) => s.card === sec.rooms[1])
    ok(`${tag}: подпись меняется посреди клипа`, i > 0 && log[i].vOn && log[i].tailOn === 0 && log[i].t < Math.max(...log.map((s) => s.t || 0)) - 0.5,
      i > 0 ? `«${sec.rooms[1]}» с ${log[i].t?.toFixed(1)} с видео` : 'не нашлась')
  }
  if (sec.tail) ok(`${tag}: после видео проявляются кадры`, log.some((s) => s.tailOn > 0), `шагов с кадром: ${log.filter((s) => s.tailOn).length}`)
  ok(`${tag}: нет ошибок в консоли`, !errors.length, errors.slice(0, 3).join(' | '))

  const video = page.video()
  await ctx.close()
  if (video && OUT) fs.renameSync(await video.path(), path.join(OUT, `walk-${tag}.webm`))
}

;(async () => {
  if (OUT) fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ channel: 'msedge' })
  await run(browser, 'pc', { viewport: { width: 1440, height: 900 } })
  await run(browser, 'phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await browser.close()
  for (const r of results) console.log(`${r.pass ? 'OK  ' : 'FAIL'} ${r.name}${r.info ? ` — ${r.info}` : ''}`)
  process.exit(results.every((r) => r.pass) ? 0 : 1)
})()
