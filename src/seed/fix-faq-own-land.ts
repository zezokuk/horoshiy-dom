/**
 * 08.11: the company builds only in its own estates and only its own typical projects (confirmed by Илья). An older
 * database still answers «Можно построить дом по своему участку или проекту?» with «Да… проект можно адаптировать».
 * This replaces that one answer in «Компания → Вопросы и ответы» and leaves every other field as it is:
 *
 *   npx cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/fix-faq-own-land.ts
 */
import { getPayload } from 'payload'
import config from '../payload.config'

const Q = 'Можно построить дом на своём участке или по своему проекту?'
const A =
  'Нет: мы строим только в своих посёлках и только по своим типовым проектам. Если в посёлке есть свободная земля, построим на ней дом по одному из наших проектов — возможность и сроки подтвердим после проверки участка.'

const payload = await getPayload({ config })
const company = await payload.findGlobal({ slug: 'company', depth: 0 })
const faq = company.faq ?? []
const i = faq.findIndex((f) => /сво(ему|ём) участк|свое(му|м) проект/i.test(f.q))
if (i < 0) {
  console.log('faq: the «own plot» question is not there — nothing changed')
} else if (faq[i].a === A) {
  console.log('faq: already fixed')
} else {
  const next = faq.map((f, n) => (n === i ? { ...f, q: Q, a: A } : f))
  await payload.updateGlobal({ slug: 'company', data: { faq: next } })
  console.log(`faq: answer ${i + 1} of ${faq.length} replaced`)
}
process.exit(0)
