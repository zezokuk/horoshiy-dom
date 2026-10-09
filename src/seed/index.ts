/**
 * Fill the database from the demo site's data (site/lib/data.ts) and the client's original slides.
 *
 *   npm run seed            — only if the database is empty
 *   npm run seed -- --reset — wipe catalog collections and fill again
 *
 * Photos are cut from the ORIGINAL slides (1673 px wide), not from the demo's compressed copies;
 * Payload then makes the WebP sizes. Crop boxes are the same as in site/tools/crop_site.py.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import crypto from 'crypto'
import sharp from 'sharp'
import { getPayload, type Payload } from 'payload'
import config from '../payload.config'
import {
  ADVANTAGES,
  COMPANY,
  ESTATES,
  FAMILY_VALUES,
  FAQ,
  FINISHING,
  HOUSE_TYPES,
  MORTGAGE_PROGRAMS,
  UNITS,
} from '../../../site/lib/data'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const SLIDES = path.resolve(dirname, '../../../исходники-презентации')
const ENV = path.resolve(dirname, '../../.env')

type Box = { left: number; top: number; width: number; height: number }
const CROP = {
  photo: { left: 0, top: 2175, width: 1673, height: 910 },
  plan: { left: 0, top: 1265, width: 1673, height: 885 },
  cover: { left: 0, top: 930, width: 1673, height: 2260 },
  scheme: { left: 0, top: 1100, width: 1673, height: 2194 },
  hero: { left: 0, top: 2220, width: 1673, height: 865 }, // 16420356: without the slide's white strip on top
} satisfies Record<string, Box>
const COVERS: Record<string, string> = { 'yuzhnyy-veter': '14950302', kalina: '14950306', 'krasnaya-39': '14950315', 'druzhby-43': '14950321', dinskaya: '16420344' }
const SCHEMES: Record<string, string> = { 'yuzhnyy-veter': '15573469', kalina: '15573473', 'krasnaya-39': '15625352', 'druzhby-43': '12050714', dinskaya: '16420345' }

const media = new Map<string, number>() // "kind:slide" → media id, so shared photos are uploaded once

async function slideCrop(payload: Payload, slide: string, kind: keyof typeof CROP, alt: string) {
  const key = `${kind}:${slide}`
  const cached = media.get(key)
  if (cached) return cached
  const file = path.join(SLIDES, `${slide}.jpeg`)
  if (!fs.existsSync(file)) throw new Error(`no slide ${file}`)
  const data = await sharp(file).extract(CROP[kind]).jpeg({ quality: 92 }).toBuffer()
  const doc = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype: 'image/jpeg', name: `${kind}-${slide}.jpg`, size: data.length },
  })
  media.set(key, doc.id as number)
  return doc.id as number
}

const baseType = (t: string) => t.replace(/\s*\(.*\)\s*$/, '') // «Тип 5 (В2)» → «Тип 5»
const slugOfType = (t: string) => 'tip-' + baseType(t).replace(/\D/g, '')

async function ensureAdmin(payload: Payload) {
  const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
  if (totalDocs > 0) return
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@horoshiy-dom.local'
  let password = process.env.SEED_ADMIN_PASSWORD
  if (!password) {
    password = crypto.randomBytes(9).toString('base64url')
    fs.appendFileSync(ENV, `\n# created by npm run seed\nSEED_ADMIN_EMAIL=${email}\nSEED_ADMIN_PASSWORD=${password}\n`)
  }
  await payload.create({ collection: 'users', data: { email, password, name: 'Администратор', role: 'admin' }, overrideAccess: true })
  console.log(`admin: ${email} / ${password} (saved to platform/.env)`)
}

async function wipe(payload: Payload) {
  for (const collection of ['houses', 'projects', 'estates', 'regions', 'media'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } }, overrideAccess: true })
  }
}

async function run() {
  const payload = await getPayload({ config })
  const reset = process.argv.includes('--reset')
  await ensureAdmin(payload)
  if (reset) await wipe(payload)
  else if ((await payload.count({ collection: 'regions' })).totalDocs > 0) {
    console.log('database already has regions — run with --reset to refill')
    process.exit(0)
  }

  // Regions. Only Krasnodar is real today; Moscow and the sea are the client's plans (09.10) — «soon» / hidden until confirmed.
  const krd = await payload.create({
    collection: 'regions',
    data: {
      name: 'Краснодар и Адыгея',
      shortName: 'Краснодар',
      slug: 'krd',
      status: 'active',
      order: 1,
      tagline: 'Козет, Новая Адыгея и Динская — от 15 до 40 минут до Краснодара',
      intro: `${ESTATES.length} посёлков рядом с Краснодаром: готовые кирпичные дома с участком и стройка по нашим проектам.`,
      mapCodes: ['RU-KDA', 'RU-AD'],
      lat: 45.1,
      lng: 39.1,
      zoom: 10,
      office: { address: `${COMPANY.address}, ${COMPANY.region}`, hours: COMPANY.hours, phone: COMPANY.phone, email: COMPANY.email },
    },
  })
  await payload.create({
    collection: 'regions',
    data: {
      name: 'Москва и область',
      shortName: 'Москва',
      slug: 'msk',
      status: 'soon',
      order: 2,
      tagline: 'Готовим проекты — запишитесь, чтобы узнать первыми',
      intro: 'Готовим проекты в Москве и области. Оставьте контакты — расскажем первыми, когда откроем продажи.',
      internalNote: 'Черновик 09.10: уточнить на созвоне направление, сроки и формат (готовые дома / стройка на участке клиента).',
      mapCodes: ['RU-MOW', 'RU-MOS'],
      lat: 55.75,
      lng: 37.62,
      zoom: 8,
    },
  })
  await payload.create({
    collection: 'regions',
    data: {
      name: 'Черноморское побережье',
      shortName: 'Море',
      slug: 'more',
      status: 'hidden',
      order: 3,
      internalNote: 'Место не известно — уточнить на созвоне, затем указать субъект, координаты и сменить статус на «Скоро».',
    },
  })

  // Projects (house designs): one per base type; photo and plan from the card of that exact type when it exists.
  const projects = new Map<string, number>()
  const baseTypes = [...new Set(Object.keys(HOUSE_TYPES).map(baseType))].sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')))
  for (const t of baseTypes) {
    const unit = UNITS.find((u) => u.type === t) ?? UNITS.find((u) => baseType(u.type) === t)
    const ht = HOUSE_TYPES[t] ?? HOUSE_TYPES[unit?.type ?? '']
    const doc = await payload.create({
      collection: 'projects',
      data: {
        name: t,
        slug: slugOfType(t),
        order: Number(t.replace(/\D/g, '')),
        area: unit?.area,
        mansard: unit?.mansard,
        storeys: ht?.features.includes('Два этажа') ? 2 : 1,
        bedrooms: ht?.bedrooms,
        bathrooms: ht?.bathrooms,
        features: ht?.features ?? [],
        photo: unit ? await slideCrop(payload, unit.image, 'photo', `Дом «${t}»`) : undefined,
        plan: unit ? await slideCrop(payload, unit.image, 'plan', `Планировка «${t}»`) : undefined,
      },
    })
    projects.set(t, doc.id as number)
  }

  // Estates
  const estates = new Map<string, number>()
  for (const [i, e] of ESTATES.entries()) {
    const doc = await payload.create({
      collection: 'estates',
      data: {
        name: e.name,
        slug: e.slug,
        region: krd.id,
        status: UNITS.some((u) => u.estate === e.slug && u.status === 'free') ? 'selling' : 'soldOut',
        order: i + 1,
        place: e.place,
        address: e.address,
        district: e.region,
        kind: e.kind,
        homes: e.homes,
        tagline: e.tagline,
        description: e.description,
        cover: await slideCrop(payload, COVERS[e.slug], 'cover', `Обложка проекта «${e.name}»`),
        scheme: await slideCrop(payload, SCHEMES[e.slug], 'scheme', `Генплан «${e.name}» от застройщика`),
        lat: e.coords[0],
        lng: e.coords[1],
        streets: e.streets ?? [],
        nearby: e.nearby.map((n) => ({ label: n.label, value: n.time })),
        utilities: e.utilities,
        infrastructure: e.infrastructure,
        extras: e.extras ?? [],
        genplan: e.genplan,
      },
    })
    estates.set(e.slug, doc.id as number)
  }

  // Houses (price grid rows)
  for (const u of UNITS) {
    const ht = HOUSE_TYPES[u.type]
    await payload.create({
      collection: 'houses',
      data: {
        code: u.id,
        estate: estates.get(u.estate)!,
        project: projects.get(baseType(u.type)),
        title: u.type,
        status: u.status,
        price: u.price,
        area: u.area,
        mansard: u.mansard,
        plot: u.plot,
        bedrooms: ht?.bedrooms,
        bathrooms: ht?.bathrooms,
        features: ht?.features ?? [],
        photo: await slideCrop(payload, u.image, 'photo', `Дом «${u.type}»`),
        plan: await slideCrop(payload, u.image, 'plan', `Планировка «${u.type}»`),
        note: u.note,
      },
    })
  }

  const hero = await slideCrop(payload, '16420356', 'hero', 'Кирпичный дом «Хорошего дома», проект «Тип 5»')

  await payload.updateGlobal({
    slug: 'company',
    data: {
      heroPhoto: hero,
      heroCaption: 'Проект «Тип 5»', // the same photo is in 5 estates' cards — do not name a place
      finishing: FINISHING,
      name: COMPANY.name,
      slogan: COMPANY.slogan,
      since: COMPANY.since,
      phone: COMPANY.phone,
      email: COMPANY.email,
      telegram: COMPANY.telegram,
      values: FAMILY_VALUES.map((v) => ({ title: v.title, text: v.text })),
      advantages: ADVANTAGES.map((a) => ({ title: a.title, text: a.text })),
      faq: FAQ.map((f) => ({ q: f.q, a: f.a })),
      mortgage: MORTGAGE_PROGRAMS.map((m) => ({ title: m.name, text: m.text })),
    },
  })

  const count = async (c: 'regions' | 'estates' | 'projects' | 'houses' | 'media') => (await payload.count({ collection: c })).totalDocs
  console.log(`seeded: regions ${await count('regions')}, estates ${await count('estates')}, projects ${await count('projects')}, houses ${await count('houses')}, media ${await count('media')}`)
  process.exit(0)
}

// top-level await: `payload run` exits as soon as this module finishes loading, so the work must be awaited here
await run().catch((e) => {
  console.error(e)
  process.exit(1)
})
