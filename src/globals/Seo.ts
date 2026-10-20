import type { Field, GlobalConfig } from 'payload'
import { adminOnly, adminOnlyInMenu, anyone } from '../collections/access'
import { revalidateGlobal } from '../collections/revalidate'

/** The site's own pages whose title and description the client may set (estates, houses, projects and promo pages have
 *  their own «SEO» fields; empty means the text the site builds from the data). */
export const SEO_PAGES = [
  ['home', 'Главная'],
  ['build', 'Построить'],
  ['catalog', 'Готовые дома'],
  ['projects', 'Проекты'],
  ['locations', 'Локации'],
  ['mortgage', 'Ипотека'],
  ['about', 'О компании'],
  ['contacts', 'Контакты'],
] as const
export type SeoPage = (typeof SEO_PAGES)[number][0]

/** Title and description for search and for link previews; shared by the pages here and by estates, projects, promo pages. */
export const seoFields: Field[] = [
  { name: 'title', label: 'Заголовок для поиска (title)', type: 'text', maxLength: 70, admin: { description: 'До 60 знаков: что и где. Пусто — по умолчанию' } },
  { name: 'description', label: 'Описание для поиска', type: 'textarea', maxLength: 200, admin: { description: '120–160 знаков: факты, цифры, без «лучший»' } },
]

/**
 * SEO and search (20.10): page titles and descriptions, the Yandex Webmaster and Google Search Console confirmation
 * codes, the picture shown when a link is shared in a messenger. The client sets them without code.
 */
export const Seo: GlobalConfig = {
  slug: 'seo',
  label: 'SEO и поиск',
  admin: {
    group: 'Настройки',
    hidden: adminOnlyInMenu,
    description: 'Как сайт выглядит в Яндексе, Google и в ссылках в мессенджерах. Пустое поле — текст, который сайт собирает сам.',
  },
  access: { read: anyone, update: adminOnly },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Страницы',
          fields: SEO_PAGES.map(([name, label]) => ({ name, label, type: 'group' as const, fields: seoFields })),
        },
        {
          label: 'Подтверждение и ссылки',
          fields: [
            {
              name: 'yandexVerification',
              label: 'Яндекс Вебмастер: код подтверждения',
              type: 'text',
              admin: { description: 'Из мета-тега <meta name="yandex-verification" content="…"> — только то, что в кавычках после content' },
            },
            {
              name: 'googleVerification',
              label: 'Google Search Console: код подтверждения',
              type: 'text',
              admin: { description: 'Из мета-тега google-site-verification — только значение content' },
            },
            {
              name: 'shareImage',
              label: 'Картинка для ссылок (Telegram, VK, WhatsApp)',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Горизонтальная, 1200×630. Пусто — без картинки по умолчанию; у домов и посёлков — их фото' },
            },
          ],
        },
      ],
    },
  ],
}
