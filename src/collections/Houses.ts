import type { CollectionConfig } from 'payload'
import { anyone, inMyRegions, staffField } from './access'

/**
 * A concrete house for sale (one row of the developer's price grid). Managers change status and price here from a phone.
 * `region` is copied from the estate on save so access rules and region pages can filter without a join.
 */
export const Houses: CollectionConfig = {
  slug: 'houses',
  labels: { singular: 'Дом', plural: 'Дома' },
  admin: { useAsTitle: 'code', defaultColumns: ['code', 'estate', 'status', 'price', 'area'], group: 'Каталог', listSearchableFields: ['code'] },
  defaultSort: 'price',
  access: { read: anyone, create: inMyRegions('region'), update: inMyRegions('region'), delete: inMyRegions('region') },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (data.estate) {
          const id = typeof data.estate === 'object' ? data.estate.id : data.estate
          const estate = await req.payload.findByID({ collection: 'estates', id, depth: 0, req })
          data.region = typeof estate.region === 'object' ? estate.region.id : estate.region
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'code', label: 'Адрес страницы', type: 'text', required: true, unique: true, index: true, admin: { description: 'Например: yv-tip5' } },
    { name: 'estate', label: 'Посёлок', type: 'relationship', relationTo: 'estates', required: true, index: true },
    { name: 'region', type: 'relationship', relationTo: 'regions', index: true, admin: { readOnly: true, position: 'sidebar', description: 'Берётся из посёлка' } },
    { name: 'project', label: 'Проект', type: 'relationship', relationTo: 'projects' },
    { name: 'title', label: 'Тип (как в шахматке)', type: 'text', required: true, admin: { description: '«Тип 5 (В2)»' } },
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      required: true,
      defaultValue: 'free',
      options: [
        { label: 'Свободен', value: 'free' },
        { label: 'Бронь', value: 'reserved' },
        { label: 'Продан', value: 'sold' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'price', label: 'Цена, ₽', type: 'number', required: true, admin: { position: 'sidebar' } },
    {
      type: 'row',
      fields: [
        { name: 'area', label: 'Площадь, м²', type: 'number', required: true },
        { name: 'mansard', label: 'Мансарда, м²', type: 'number' },
        { name: 'plot', label: 'Участок', type: 'text', admin: { description: '«4,2 сот.»' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'bedrooms', label: 'Спален', type: 'number' },
        { name: 'bathrooms', label: 'Санузлов', type: 'number' },
      ],
    },
    { name: 'features', label: 'Особенности', type: 'text', hasMany: true },
    { name: 'photo', label: 'Фото', type: 'upload', relationTo: 'media' },
    { name: 'plan', label: 'Планировка', type: 'upload', relationTo: 'media' },
    { name: 'note', label: 'Заметка для своих', type: 'textarea', access: { read: staffField }, admin: { description: 'На сайте не показывается' } },
  ],
}
