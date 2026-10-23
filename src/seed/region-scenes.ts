/**
 * «Краснодар и Адыгея»: the first screen's picture — our house with a fan of the region's scenes around it, made by
 * Илья in ChatGPT (Промты/lark/первый-экран-регион-остров.md v2; the copy in 04-Хороший-дом/первый-экран-регион) —
 * and the labels the site puts over the scenes. Used by the seed and, for a filled database, on its own:
 *
 *   npx cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/add-region-scenes.ts
 */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import type { Payload } from 'payload'

const dirname = path.dirname(fileURLToPath(import.meta.url))
// a copy of 04-Хороший-дом/первый-экран-регион/сцены-краснодар.png, so a fresh clone of the repo seeds on its own
export const KRD_SCENES = path.resolve(dirname, '../../seed-assets/region-krd.png')

// x, y — percent of the picture (square 1254 px), on the sky of each slice; numbers only from the client's materials:
// «двор и парковка на 2 машины», «до школы 2–5 минут» (FAQ), «от 15 до 40 минут до Краснодара» (the region's tagline)
export const KRD_LABELS = [
  { title: 'Горы Адыгеи', text: 'плато Лаго-Наки', x: 14, y: 47 },
  { title: 'Хаджохская теснина', text: 'горная река', x: 15, y: 80 },
  { title: 'Свой двор', text: 'парковка на 2 машины', x: 38, y: 71 },
  { title: 'Школа рядом', text: 'до школы 2–5 минут', x: 62, y: 71 },
  { title: 'Стадион и парк', text: 'Краснодар — 15–40 минут', x: 80, y: 62 },
  { title: 'Кубань', text: 'подсолнухи и виноградники', x: 86, y: 47 },
]

export async function addRegionScenes(payload: Payload) {
  const found = await payload.find({ collection: 'regions', where: { slug: { equals: 'krd' } }, limit: 1, depth: 0 })
  const region = found.docs[0]
  // already there (a second run) or nothing to add: no duplicate pictures in the media library
  if (!region || region.scenes || !fs.existsSync(KRD_SCENES)) return false
  const data = fs.readFileSync(KRD_SCENES)
  const media = await payload.create({
    collection: 'media',
    data: { alt: 'Кирпичный дом и веер сцен региона: горы Адыгеи, теснина, свой двор, школа, стадион Краснодара, Кубань (иллюстрация)' },
    file: { data, mimetype: 'image/png', name: 'scenes-krd.png', size: data.length },
  })
  await payload.update({ collection: 'regions', id: region.id, data: { scenes: media.id, sceneLabels: KRD_LABELS } })
  return true
}
