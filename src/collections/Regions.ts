import type { CollectionConfig } from 'payload'
import { adminOnly, adminOnlyInMenu, anyone, staffField } from './access'
import { revalidateAfterChange, revalidateAfterDelete } from './revalidate'

/**
 * A region where the company builds or sells (Краснодар и Адыгея, Москва и область, побережье…).
 * Each region lives on its own subdomain (slug.домен.ru) — one Yandex region per subdomain, see 17-Один-сайт-на-все-регионы.md.
 * A new region is a new record here, not a new site.
 */
export const Regions: CollectionConfig = {
  slug: 'regions',
  labels: { singular: 'Регион', plural: 'Регионы' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'status', 'order'], group: 'Каталог', hidden: adminOnlyInMenu },
  defaultSort: 'order',
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  fields: [
    { name: 'name', label: 'Название', type: 'text', required: true, admin: { description: 'Например: Краснодар и Адыгея' } },
    { name: 'shortName', label: 'Коротко (в шапке и на карте)', type: 'text', required: true },
    {
      name: 'slug',
      label: 'Поддомен',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Латиницей: krd → krd.домен.ru' },
      validate: (v: string | null | undefined) => (/^[a-z][a-z0-9-]{1,30}$/.test(v || '') ? true : 'Только латиница, цифры и дефис'),
    },
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      required: true,
      defaultValue: 'soon',
      options: [
        { label: 'Продаём и строим', value: 'active' },
        { label: 'Скоро (лист ожидания)', value: 'soon' },
        { label: 'Скрыт', value: 'hidden' },
      ],
    },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 10 },
    { name: 'tagline', label: 'Подзаголовок', type: 'text' },
    { name: 'intro', label: 'Описание региона', type: 'textarea' },
    {
      name: 'internalNote',
      label: 'Заметка для своих',
      type: 'textarea',
      access: { read: staffField },
      admin: { description: 'На сайте не показывается: что уточнить, что ждём от клиента' },
    },
    { name: 'cover', label: 'Обложка', type: 'upload', relationTo: 'media' },
    {
      name: 'scenes',
      label: 'Картинка первого экрана',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Квадратная картинка: дом в центре, вокруг веер сцен региона (горы, город, свой двор), сверху тёмное поле. Подписи к сценам — ниже, их ставит сайт. Пусто — на первом экране фото дома',
      },
    },
    {
      name: 'sceneLabels',
      label: 'Подписи сцен на картинке',
      type: 'array',
      labels: { singular: 'Подпись', plural: 'Подписи' },
      admin: {
        description: 'Слева и Сверху — где подпись на картинке, в процентах от её ширины и высоты. Цифры — только из своих материалов',
        condition: (data) => Boolean(data?.scenes),
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'title', label: 'Подпись', type: 'text', required: true },
            { name: 'text', label: 'Строка под ней', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'x', label: 'Слева, %', type: 'number', required: true, min: 0, max: 100 },
            { name: 'y', label: 'Сверху, %', type: 'number', required: true, min: 0, max: 100 },
          ],
        },
      ],
    },
    {
      name: 'mapCodes',
      label: 'Субъекты РФ на карте',
      type: 'text',
      hasMany: true,
      admin: { description: 'Коды ISO 3166-2:RU, например RU-KDA, RU-AD. Подсвечиваются на карте России' },
    },
    {
      type: 'row',
      fields: [
        { name: 'lat', label: 'Широта центра', type: 'number' },
        { name: 'lng', label: 'Долгота центра', type: 'number' },
        { name: 'zoom', label: 'Масштаб карты', type: 'number', defaultValue: 9 },
      ],
    },
    {
      name: 'office',
      label: 'Офис продаж',
      type: 'group',
      fields: [
        { name: 'address', label: 'Адрес', type: 'text' },
        { name: 'hours', label: 'Часы работы', type: 'text' },
        { name: 'phone', label: 'Телефон', type: 'text' },
        { name: 'email', label: 'Почта', type: 'email' },
      ],
    },
    {
      name: 'leadChatIds',
      label: 'Telegram для заявок (id чатов)',
      type: 'text',
      hasMany: true,
      access: { read: staffField },
      admin: { description: 'Заявки из этого региона уходят сюда. Пусто — в общий чат компании' },
    },
  ],
}
