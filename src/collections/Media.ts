import type { CollectionConfig } from 'payload'
import { anyone, staffOnly } from './access'

/** Photos, plans, covers. Sharp makes WebP sizes on upload, so editors can upload phone photos as they are. */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Фото и файлы' },
  admin: { group: 'Настройки' },
  access: { read: anyone, create: staffOnly, update: staffOnly, delete: staffOnly },
  // the description is optional: a manager adding a house from a phone just picks a photo. Empty → made from the file name;
  // the site's own pages describe house pictures themselves («Тип 5 в посёлке Динская»)
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (!data.alt?.trim() && data.filename) data.alt = String(data.filename).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
        return data
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      label: 'Описание (для слабовидящих и поиска)',
      type: 'text',
      admin: { description: 'Можно не заполнять' },
    },
  ],
  upload: {
    mimeTypes: ['image/*', 'application/pdf', 'video/mp4', 'video/webm', 'video/quicktime'], // video: room tours on house plans
    formatOptions: { format: 'webp', options: { quality: 84 } },
    imageSizes: [
      { name: 'card', width: 640, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'wide', width: 1600, formatOptions: { format: 'webp', options: { quality: 84 } } },
    ],
    adminThumbnail: 'card',
  },
}
