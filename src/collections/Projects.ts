import type { CollectionConfig } from 'payload'
import { adminOnly, anyone } from './access'

/** A house design (Тип 1 … Тип 12) — shared by all regions: sold as a ready house or built on order. */
export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Проект дома', plural: 'Проекты домов' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'area', 'storeys', 'bedrooms'], group: 'Каталог' },
  defaultSort: 'order',
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'name', label: 'Название', type: 'text', required: true, admin: { description: 'Как в шахматке: «Тип 5»' } },
    { name: 'slug', label: 'Адрес страницы', type: 'text', required: true, unique: true, index: true },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 10 },
    {
      type: 'row',
      fields: [
        { name: 'area', label: 'Площадь, м²', type: 'number' },
        { name: 'mansard', label: 'Мансарда, м²', type: 'number' },
        { name: 'storeys', label: 'Этажей', type: 'number', defaultValue: 1 },
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
      name: 'spec3d',
      label: '3D-описание (JSON)',
      type: 'json',
      admin: { description: 'Из 3D-задания (3D-задание/README.md). Проверка: site/tools/check3d.py' },
    },
  ],
}
