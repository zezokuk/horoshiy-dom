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
  admin: { useAsTitle: 'name', defaultColumns: ['createdAt', 'name', 'phone', 'house', 'estate', 'source', 'interest', 'status'], group: 'Продажи' },
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
    {
      name: 'interest',
      label: 'Что интересует',
      type: 'select',
      index: true,
      options: [
        { label: 'Купить готовый дом', value: 'buy' },
        { label: 'Построить дом', value: 'build' },
        { label: 'Присматривается, на будущее', value: 'future' },
        { label: 'Ипотека', value: 'mortgage' },
      ],
      admin: { position: 'sidebar', description: '«На будущее» — база для рассылки акций и новых посёлков' },
    },
    // where the lead came from: the house / estate page it was sent from and the traffic source — what a CRM needs to count ads
    {
      type: 'row',
      fields: [
        { name: 'house', label: 'Дом', type: 'relationship', relationTo: 'houses' },
        { name: 'estate', label: 'Посёлок', type: 'relationship', relationTo: 'estates' },
      ],
    },
    {
      name: 'source',
      label: 'Источник',
      type: 'text',
      admin: { description: 'Реклама (по UTM), переход с сайта (по referrer) или прямой заход — определяется сам' },
    },
    { name: 'context', label: 'Что смотрел', type: 'text' },
    { name: 'page', label: 'Страница', type: 'text' },
    { name: 'utm', label: 'Реклама (UTM)', type: 'json' },
    { name: 'ref', label: 'Пришёл с', type: 'text' },
    { name: 'delivery', label: 'Telegram', type: 'text', admin: { readOnly: true, position: 'sidebar', description: 'ok — менеджеру пришло сообщение; off — бот не настроен' } },
    {
      name: 'crm',
      label: 'amoCRM',
      type: 'select',
      options: [
        { label: 'Отправлена', value: 'sent' },
        { label: 'В очереди (amoCRM не ответила, повторим)', value: 'queued' },
        { label: 'Ошибка (10 попыток)', value: 'error' },
        { label: 'Не подключена', value: 'off' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
    { name: 'crmId', label: 'Сделка в amoCRM, №', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'crmTries', label: 'Попыток отправки', type: 'number', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'crmError', label: 'Ответ amoCRM', type: 'text', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'landing', label: 'Первая страница визита', type: 'text', admin: { readOnly: true } },
    { name: 'managerNote', label: 'Комментарий менеджера', type: 'textarea' },
  ],
}
