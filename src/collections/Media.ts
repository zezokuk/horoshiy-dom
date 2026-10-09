import type { CollectionConfig } from 'payload'
import { anyone, staffOnly } from './access'

/** Photos, plans, covers. Sharp makes WebP sizes on upload, so editors can upload phone photos as they are. */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Фото и файлы' },
  admin: { group: 'Настройки' },
  access: { read: anyone, create: staffOnly, update: staffOnly, delete: staffOnly },
  fields: [{ name: 'alt', label: 'Описание (для слабовидящих и поиска)', type: 'text', required: true }],
  upload: {
    mimeTypes: ['image/*', 'application/pdf'],
    formatOptions: { format: 'webp', options: { quality: 84 } },
    imageSizes: [
      { name: 'card', width: 640, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'wide', width: 1600, formatOptions: { format: 'webp', options: { quality: 84 } } },
    ],
    adminThumbnail: 'card',
  },
}
