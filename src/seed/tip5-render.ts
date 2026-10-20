/**
 * «Тип 5»: the furnished top-down render made from the client's plan (04-Хороший-дом/рендер-по-плану, prompt
 * Промты/lark/план-в-рендер.md v3) and the room areas from that plan, placed over the render.
 * Used by the seed and, for a filled database, on its own:
 *
 *   npx cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/add-tip5-render.ts
 */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import type { Payload } from 'payload'

const dirname = path.dirname(fileURLToPath(import.meta.url))
export const TIP5_RENDER = path.resolve(dirname, '../../../рендер-по-плану/рендер-тип5.png')

// areas as printed on the plan; the terrace — from the project's features («Терраса 19 м²»)
export const TIP5_ROOMS = [
  { name: 'Кухня-гостиная', area: 27.2, x: 61, y: 12 },
  { name: 'Терраса', area: 19, x: 25, y: 18 },
  { name: 'Спальня', area: 13.6, x: 34.5, y: 44 },
  { name: 'Гостевая', area: 13, x: 26, y: 59.5 },
  { name: 'Санузел', area: 4.6, x: 47, y: 39 },
  { name: 'Прихожая', area: 11, x: 49, y: 66 },
  { name: 'Санузел', area: 3, x: 77.5, y: 55 },
  { name: 'Спальня', area: 14.6, x: 61, y: 70 },
]

export async function addTip5Render(payload: Payload) {
  const found = await payload.find({ collection: 'projects', where: { slug: { equals: 'tip-5' } }, limit: 1, depth: 0 })
  const project = found.docs[0]
  if (!project || !fs.existsSync(TIP5_RENDER)) return false
  const data = fs.readFileSync(TIP5_RENDER)
  const media = await payload.create({
    collection: 'media',
    data: { alt: 'Визуализация планировки «Тип 5», мебель для примера' },
    file: { data, mimetype: 'image/png', name: 'render-tip-5.png', size: data.length },
  })
  await payload.update({ collection: 'projects', id: project.id, data: { render: media.id, rooms: TIP5_ROOMS } })
  return true
}
