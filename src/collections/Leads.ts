import type { CollectionConfig } from 'payload'
import { adminOnly, inMyRegions } from './access'
import { leadEndpoint } from './leadEndpoint'

/**
 * Leads from every form on the site. Created only by /api/lead (server code, overrideAccess) — never directly by visitors.
 * Managers see and work the leads of their own regions.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Заявка', plural: 'Заявки' },
  admin: { useAsTitle: 'name', defaultColumns: ['createdAt', 'name', 'phone', 'region', 'status', 'context'], group: 'Продажи' },
  defaultSort: '-createdAt',
  access: { read: inMyRegions('region'), create: () => false, update: inMyRegions('region'), delete: adminOnly },
  endpoints: [leadEndpoint],
  fields: [
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'Новая', value: 'new' },
        { label: 'В работе', value: 'work' },
        { label: 'Показ назначен', value: 'visit' },
        { label: 'Закрыта', value: 'done' },
        { label: 'Спам / ошибка', value: 'spam' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'name', label: 'Имя', type: 'text', required: true },
    { name: 'phone', label: 'Телефон', type: 'text', required: true },
    { name: 'region', label: 'Регион', type: 'relationship', relationTo: 'regions', index: true },
    { name: 'context', label: 'Что смотрел', type: 'text' },
    { name: 'page', label: 'Страница', type: 'text' },
    { name: 'utm', label: 'Реклама (UTM)', type: 'json' },
    { name: 'ref', label: 'Пришёл с', type: 'text' },
    { name: 'delivery', label: 'Доставка уведомлений', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'managerNote', label: 'Комментарий менеджера', type: 'textarea' },
  ],
}
