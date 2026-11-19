import type { CollectionConfig } from 'payload'
import { anyone, inMyRegions, staffField } from './access'
import { revalidateAfterChange, revalidateAfterDelete } from './revalidate'

/**
 * A concrete house for sale (one row of the developer's price grid). Managers change status and price here from a phone.
 * `region` is copied from the estate on save so access rules and region pages can filter without a join.
 */
export const Houses: CollectionConfig = {
  slug: 'houses',
  labels: { singular: 'Дом', plural: 'Дома' },
  admin: { useAsTitle: 'code', defaultColumns: ['code', 'estate', 'status', 'price', 'area'], group: 'Каталог', listSearchableFields: ['code'] },
  defaultSort: 'price',
  access: { read: anyone, create: inMyRegions('region', 'content'), update: inMyRegions('region', 'content', 'sales'), delete: inMyRegions('region', 'content') },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
    beforeChange: [
      async ({ data, req, operation }) => {
        if (data.estate) {
          const id = typeof data.estate === 'object' ? data.estate.id : data.estate
          const estate = await req.payload.findByID({ collection: 'estates', id, depth: 0, req })
          data.region = typeof estate.region === 'object' ? estate.region.id : estate.region
        }
        // a new house of a known project: what the manager left empty comes from the project (bedrooms, mansard, features…),
        // so adding a house is «посёлок, проект, тип, площадь, цена» — a minute from a phone
        if (operation === 'create' && data.project) {
          const id = typeof data.project === 'object' ? data.project.id : data.project
          const p = await req.payload.findByID({ collection: 'projects', id, depth: 0, req })
          for (const k of ['mansard', 'bedrooms', 'bathrooms'] as const) if (data[k] == null && p[k] != null) data[k] = p[k]
          if (!data.features?.length && p.features?.length) data.features = p.features
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'code',
      label: 'Адрес страницы',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Латиницей, без пробелов: di-tip5 → страница /houses/di-tip5' },
    },
    { name: 'estate', label: 'Посёлок', type: 'relationship', relationTo: 'estates', required: true, index: true },
    {
      name: 'region',
      label: 'Регион',
      type: 'relationship',
      relationTo: 'regions',
      index: true,
      admin: { readOnly: true, position: 'sidebar', description: 'Берётся из посёлка' },
    },
    {
      name: 'project',
      label: 'Проект',
      type: 'relationship',
      relationTo: 'projects',
      admin: { description: 'Спальни, санузлы, мансарда и особенности подставятся из проекта, если их не заполнить. Без фото и планировки покажем картинки проекта' },
    },
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
      admin: { position: 'sidebar', components: { Cell: '/components/admin/StatusCell#StatusCell' } },
    },
    {
      name: 'price',
      label: 'Цена, ₽',
      type: 'number',
      required: true,
      admin: { position: 'sidebar', components: { Cell: '/components/admin/PriceCell#PriceCell' } },
    },
    {
      name: 'plotNo',
      label: 'Участок на генплане, №',
      type: 'number',
      min: 1,
      admin: { position: 'sidebar', description: 'Где дом стоит на 3D-генплане посёлка. Пусто — встанет на свободный участок сам' },
    },
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
    {
      name: 'mortgagePlans',
      label: 'Расчёт ипотеки для этого дома',
      type: 'array',
      labels: { singular: 'Вариант', plural: 'Варианты' },
      admin: {
        description:
          'Как на слайде: «1 ребёнок» / «2 ребёнка» с первым взносом и кредитом от банка. Платёж считается сам по ставке и сроку из «Компания → Ипотека». Пусто — показываем общий расчёт',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'title', label: 'Заголовок', type: 'text', required: true, admin: { description: '«1 ребёнок»' } },
            { name: 'note', label: 'Уточнение', type: 'text', admin: { description: '«(до 7 лет)»' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'down', label: 'Первый взнос, ₽', type: 'number', required: true },
            { name: 'credit', label: 'Кредит, ₽', type: 'number', required: true },
          ],
        },
      ],
    },
    { name: 'note', label: 'Заметка для своих', type: 'textarea', access: { read: staffField }, admin: { description: 'На сайте не показывается' } },
  ],
}
