import type { CollectionConfig } from 'payload'
import { anyone, inMyRegions } from './access'
import { revalidateAfterChange, revalidateAfterDelete } from './revalidate'

/**
 * Promotions («Акции»): shown on the home page, the «Локации» page and the region pages while active.
 * A promo without a region is company-wide. Leads that came for it carry its title in «Что смотрел».
 */
export const Promos: CollectionConfig = {
  slug: 'promos',
  labels: { singular: 'Акция', plural: 'Акции' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'region', 'active', 'until'], group: 'Продажи' },
  defaultSort: 'order',
  access: { read: anyone, create: inMyRegions('region', 'content'), update: inMyRegions('region', 'content'), delete: inMyRegions('region', 'content') },
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  fields: [
    { name: 'title', label: 'Заголовок', type: 'text', required: true, admin: { description: '«Скидка 300 000 ₽ на дома в Динской»' } },
    { name: 'text', label: 'Условия коротко', type: 'textarea' },
    { name: 'image', label: 'Картинка', type: 'upload', relationTo: 'media' },
    { name: 'region', label: 'Регион', type: 'relationship', relationTo: 'regions', admin: { description: 'Пусто — акция для всех регионов' } },
    { name: 'link', label: 'Ссылка кнопки', type: 'text', admin: { description: 'Например: /catalog или https://krd.… Пусто — кнопка открывает заявку' } },
    { name: 'cta', label: 'Текст кнопки', type: 'text', defaultValue: 'Узнать условия' },
    {
      type: 'row',
      fields: [
        { name: 'active', label: 'Показывать', type: 'checkbox', defaultValue: true },
        { name: 'until', label: 'Действует до', type: 'date', admin: { description: 'После этой даты скрывается сама' } },
        { name: 'order', label: 'Порядок', type: 'number', defaultValue: 10 },
      ],
    },
  ],
}
