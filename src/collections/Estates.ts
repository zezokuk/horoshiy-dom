import type { CollectionConfig } from 'payload'
import { anyone, inMyRegions } from './access'
import { revalidateAfterChange, revalidateAfterDelete } from './revalidate'
import { seoFields } from '../globals/Seo'

/** A village / project inside a region (Южный ветер, Калина…). Its page shows the 3D master plan and the houses. */
export const Estates: CollectionConfig = {
  slug: 'estates',
  labels: { singular: 'Посёлок', plural: 'Посёлки' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'region', 'status', 'homes'], group: 'Каталог' },
  defaultSort: 'order',
  access: { read: anyone, create: inMyRegions('region', 'content'), update: inMyRegions('region', 'content'), delete: inMyRegions('region', 'content') },
  hooks: {
    afterChange: [
      // «Продажи завершены» closes the whole estate: its houses become «Продан», so none stays on sale by mistake
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'update' && doc.status === 'soldOut' && previousDoc?.status !== 'soldOut') {
          await req.payload.update({
            collection: 'houses',
            where: { and: [{ estate: { equals: doc.id } }, { status: { not_equals: 'sold' } }] },
            data: { status: 'sold' },
            req,
          })
        }
        return doc
      },
      revalidateAfterChange,
    ],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    { name: 'name', label: 'Название', type: 'text', required: true },
    { name: 'slug', label: 'Адрес страницы', type: 'text', required: true, unique: true, index: true },
    { name: 'region', label: 'Регион', type: 'relationship', relationTo: 'regions', required: true, index: true },
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      defaultValue: 'selling',
      options: [
        { label: 'Идут продажи', value: 'selling' },
        { label: 'Продажи завершены', value: 'soldOut' },
        { label: 'Скоро', value: 'planned' },
      ],
      admin: {
        description:
          '«Продажи завершены» — все дома посёлка станут «Продан», на сайте посёлок покажется как построенный и проданный. «Скоро» — без цифр и генплана, с формой «Узнать о старте продаж»',
      },
    },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 10 },
    { name: 'place', label: 'Где (коротко)', type: 'text', admin: { description: 'Например: аул Козет' } },
    { name: 'address', label: 'Адрес', type: 'text' },
    { name: 'district', label: 'Район / край', type: 'text' },
    { name: 'kind', label: 'Тип', type: 'text', admin: { description: 'Коттеджный посёлок, проект…' } },
    { name: 'homes', label: 'Домов всего', type: 'number' },
    { name: 'tagline', label: 'Подзаголовок', type: 'text' },
    { name: 'description', label: 'Описание', type: 'textarea' },
    { name: 'cover', label: 'Обложка', type: 'upload', relationTo: 'media' },
    { name: 'scheme', label: 'Генплан застройщика (картинка)', type: 'upload', relationTo: 'media' },
    {
      name: 'poster',
      label: 'Заставка 3D-генплана',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Картинка на месте 3D, пока он загружается. Можно оставить пустым' },
    },
    {
      type: 'row',
      fields: [
        { name: 'lat', label: 'Широта', type: 'number' },
        { name: 'lng', label: 'Долгота', type: 'number' },
      ],
    },
    { name: 'streets', label: 'Улицы', type: 'text', hasMany: true },
    {
      name: 'nearby',
      label: 'Что рядом',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', label: 'Что', type: 'text', required: true },
            { name: 'value', label: 'Сколько', type: 'text', required: true },
          ],
        },
      ],
    },
    { name: 'utilities', label: 'Коммуникации', type: 'text', hasMany: true },
    { name: 'infrastructure', label: 'Инфраструктура', type: 'text', hasMany: true },
    { name: 'extras', label: 'Особенности посёлка', type: 'text', hasMany: true },
    {
      name: 'genplan',
      label: 'Генплан (раскладка)',
      type: 'json',
      admin: {
        description:
          'Ряды участков для 3D-генплана: {"rows":[6,6],"road":"between","commercial":3} — два ряда по 6, улица между ними, 3 коммерческих здания. Пусто — сетка по числу домов. Позже — участки по генплану застройщика',
      },
    },
    { name: 'seo', label: 'SEO: как страница выглядит в поиске', type: 'group', admin: { description: 'Пусто — заголовок и описание соберутся из полей выше' }, fields: seoFields },
  ],
}
