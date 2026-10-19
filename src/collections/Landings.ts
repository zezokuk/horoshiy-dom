import type { CollectionConfig } from 'payload'
import { anyone, inMyRegions } from './access'
import { revalidateAfterChange, revalidateAfterDelete } from './revalidate'

/**
 * Promo pages of districts — landing pages for Yandex Direct and VK Ads ads (the 150 package): one district or estate,
 * one offer, hard facts, the form near the top. The team makes a new one in the admin in a couple of minutes:
 * an ad then points to krd.домен.ru/p/<адрес>?utm_source=… and every lead from it is marked with the page.
 */
export const Landings: CollectionConfig = {
  slug: 'landings',
  labels: { singular: 'Промо-страница', plural: 'Промо-страницы' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'region', 'estate', 'active'],
    group: 'Реклама',
    description: 'Страница под объявление: адрес на сайте — поддомен региона /p/<адрес>. Цифры — только проверенные: их увидит покупатель',
  },
  access: { read: anyone, create: inMyRegions('region'), update: inMyRegions('region'), delete: inMyRegions('region') },
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  fields: [
    { name: 'title', label: 'Заголовок', type: 'text', required: true, admin: { description: 'Как в объявлении: «Дома в Динской от 8,8 млн»' } },
    {
      name: 'slug',
      label: 'Адрес страницы',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Латиницей: dinskaya-ipoteka → krd.домен.ru/p/dinskaya-ipoteka' },
    },
    { name: 'active', label: 'Показывать', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar', description: 'Выключили — страница отвечает 404' } },
    { name: 'region', label: 'Регион', type: 'relationship', relationTo: 'regions', required: true, index: true, admin: { position: 'sidebar' } },
    {
      name: 'estate',
      label: 'Посёлок',
      type: 'relationship',
      relationTo: 'estates',
      admin: { position: 'sidebar', description: 'Свободные дома, цены, «что рядом» и коммуникации подтянутся сами' },
    },
    { name: 'offer', label: 'Оффер (подзаголовок)', type: 'textarea', admin: { description: 'Одно-два предложения фактами: что, где, почём, на каких условиях' } },
    {
      name: 'facts',
      label: 'Цифры под заголовком',
      type: 'array',
      maxRows: 4,
      labels: { singular: 'Цифра', plural: 'Цифры' },
      admin: { description: 'До 4: «6 мес.» — «стройка под ключ», «20 мин» — «до Краснодара». Пусто — возьмём из посёлка' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'value', label: 'Цифра', type: 'text', required: true },
            { name: 'label', label: 'Подпись', type: 'text', required: true },
          ],
        },
      ],
    },
    { name: 'cover', label: 'Картинка', type: 'upload', relationTo: 'media', admin: { description: 'Пусто — фото свободного дома или обложка посёлка' } },
    { name: 'cta', label: 'Текст кнопки', type: 'text', defaultValue: 'Получить подборку домов' },
    {
      name: 'formNote',
      label: 'Текст у формы',
      type: 'text',
      defaultValue: 'Пришлём свободные дома с ценами и расчёт семейной ипотеки по каждому.',
    },
  ],
}
