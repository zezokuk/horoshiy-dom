import type { GlobalConfig } from 'payload'
import { adminOnly, anyone } from '../collections/access'
import { revalidateGlobal } from '../collections/revalidate'

/** Company-wide facts used on every page: brand, contacts, legal details, values, FAQ, mortgage programs. */
export const Company: GlobalConfig = {
  slug: 'company',
  label: 'Компания',
  admin: { group: 'Настройки' },
  access: { read: anyone, update: adminOnly },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Бренд и контакты',
          fields: [
            { name: 'name', label: 'Название', type: 'text', required: true },
            { name: 'slogan', label: 'Слоган', type: 'text' },
            { name: 'since', label: 'Год первого дома', type: 'number' },
            { name: 'homesBuilt', label: 'Домов построено (всего)', type: 'number', admin: { description: 'Пусто — на сайте не показываем' } },
            { name: 'heroPhoto', label: 'Главное фото (первый экран)', type: 'upload', relationTo: 'media' },
            { name: 'heroCaption', label: 'Подпись к главному фото', type: 'text' },
            { name: 'phone', label: 'Телефон', type: 'text' },
            { name: 'email', label: 'Почта', type: 'email' },
            { name: 'telegram', label: 'Telegram-канал (ссылка)', type: 'text' },
            {
              name: 'leadChatIds',
              label: 'Telegram для заявок без региона',
              type: 'text',
              hasMany: true,
              access: { read: ({ req }) => Boolean(req.user) },
            },
          ],
        },
        {
          label: 'Ценности и доверие',
          fields: [
            {
              name: 'values',
              label: 'Ценности',
              type: 'array',
              fields: [
                { name: 'title', label: 'Заголовок', type: 'text', required: true },
                { name: 'text', label: 'Текст', type: 'textarea' },
              ],
            },
            {
              name: 'advantages',
              label: 'Преимущества',
              type: 'array',
              fields: [
                { name: 'title', label: 'Заголовок', type: 'text', required: true },
                { name: 'text', label: 'Текст', type: 'textarea' },
              ],
            },
            { name: 'finishing', label: 'Что входит в отделку', type: 'text', hasMany: true },
            {
              name: 'faq',
              label: 'Вопросы и ответы',
              type: 'array',
              fields: [
                { name: 'q', label: 'Вопрос', type: 'text', required: true },
                { name: 'a', label: 'Ответ', type: 'textarea', required: true },
              ],
            },
            {
              name: 'family',
              label: 'Семейная ипотека — для расчёта на странице дома',
              type: 'group',
              admin: { description: 'Условия меняются — обновите здесь, и пересчитаются все дома. Точные условия определяет банк' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'rate', label: 'Ставка, %', type: 'number', defaultValue: 6 },
                    { name: 'years', label: 'Срок, лет', type: 'number', defaultValue: 30 },
                    { name: 'minDown', label: 'Мин. первый взнос, %', type: 'number', defaultValue: 20 },
                    { name: 'limit', label: 'Лимит кредита, ₽', type: 'number', defaultValue: 6000000 },
                  ],
                },
              ],
            },
            {
              name: 'mortgage',
              label: 'Ипотечные программы',
              type: 'array',
              fields: [
                { name: 'title', label: 'Программа', type: 'text', required: true },
                { name: 'text', label: 'Описание', type: 'textarea' },
              ],
            },
          ],
        },
        {
          label: 'Реквизиты',
          fields: [
            { name: 'legalName', label: 'Юрлицо / ИП', type: 'text' },
            { name: 'inn', label: 'ИНН', type: 'text' },
            { name: 'ogrn', label: 'ОГРН / ОГРНИП', type: 'text' },
            { name: 'legalAddress', label: 'Юридический адрес', type: 'text' },
          ],
        },
      ],
    },
  ],
}
