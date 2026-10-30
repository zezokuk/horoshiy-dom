import type { GlobalConfig } from 'payload'
import { adminOnly, adminOnlyInMenu, anyone } from '../collections/access'
import { revalidateGlobal } from '../collections/revalidate'

const HEX = /^#[0-9a-fA-F]{6}$/
const hex = (v: string | null | undefined) => !v || HEX.test(v) || 'Цвет пишется так: #26352c (решётка и шесть знаков)'

/**
 * How the site looks, switched by the client without code (20.10): the site is a mockup for approval, so the first
 * screen, the colours and the effects are choices, not rewrites. Read in the layout (colours, motion), on the home page
 * (first screen, thread), on «Построить» (fan, plan → frame → house) and «Готовые дома» (key).
 */
export const Design: GlobalConfig = {
  slug: 'design',
  label: 'Внешний вид',
  admin: {
    group: 'Настройки',
    hidden: adminOnlyInMenu,
    description: 'Первый экран, цвета и приёмы сайта. Сохраните — и обновите страницу сайта.',
  },
  access: { read: anyone, update: adminOnly },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      name: 'hero',
      label: 'Первый экран главной',
      type: 'select',
      required: true,
      // defaults stay as on 20.10: changing one makes the SQLite push rebuild the table, and with the new column
      // home_order that rebuild fails (29.10). v2 is switched on by data: `npx payload run tools/look.ts`
      defaultValue: 'hero-5',
      options: [
        { label: 'Рукопожатие → дом раскрывается на весь экран (v2)', value: 'hero-6' },
        { label: 'Рукопожатие → настоящий дом', value: 'hero-5' },
        { label: 'Чертёж → дом (мышь «достраивает» дом)', value: 'hero-4' },
        { label: 'Дом перед названием', value: 'hero-1' },
        { label: 'Через 3D-генплан посёлка', value: 'hero-2' },
        { label: 'Минимализм с нитью', value: 'hero-3' },
        { label: 'Прежний: текст слева, фото справа', value: 'current' },
      ],
      admin: { description: 'Посмотреть любой вариант вживую: /preview/hero-1 … /preview/hero-5 и /preview/current' },
    },
    {
      name: 'palette',
      label: 'Цвета',
      type: 'select',
      required: true,
      defaultValue: 'forest',
      options: [
        { label: 'v2 · A «Листва»: белый фон, свежий зелёный (основной)', value: 'listva' },
        { label: 'v2 · B «Шалфей»: белый фон, спокойный зелёный', value: 'shalfey' },
        { label: 'Фирменные: тёмно-зелёный и золото', value: 'forest' },
        { label: 'Графит и латунь', value: 'graphite' },
        { label: 'Тёмно-синий и песок', value: 'navy' },
        { label: 'Тёплый: шоколад и терракота', value: 'terracotta' },
      ],
    },
    {
      name: 'homeOrder',
      label: 'Главная: кто строит и посёлки',
      type: 'select',
      // not required: SQLite schema push rebuilds a table for a new NOT NULL column and fails on the old rows (29.10);
      // empty means «founder» (home-v2.tsx)
      defaultValue: 'founder',
      options: [
        { label: 'Сначала «Кто строит», потом посёлки', value: 'founder' },
        { label: 'Сначала посёлки, потом «Кто строит»', value: 'estates' },
        { label: 'На одном экране: слева основатель, справа посёлки', value: 'together' },
      ],
      admin: { description: 'Второй и третий экраны главной (палитры v2)' },
    },
    {
      type: 'row',
      fields: [
        { name: 'colorDark', label: 'Свой тёмный цвет', type: 'text', validate: hex, admin: { placeholder: '#26352c', description: 'Фоны, кнопки. Пусто — из набора выше' } },
        { name: 'colorAccent', label: 'Свой акцент', type: 'text', validate: hex, admin: { placeholder: '#b0915f', description: 'Золото: линии, цифры, главная кнопка' } },
      ],
    },
    {
      name: 'effects',
      label: 'Приёмы',
      type: 'group',
      admin: { description: 'Выключенный приём заменяется простым вариантом, страница не ломается' },
      fields: [
        { name: 'thread', label: 'Золотая нить по главной', type: 'checkbox', defaultValue: true },
        { name: 'motion', label: 'Переходы между страницами и наклон карточек за мышью', type: 'checkbox', defaultValue: true },
        { name: 'fan', label: '«Выберите проект»: большой дом и линейка проектов (выключено — сеткой карточек)', type: 'checkbox', defaultValue: true },
        { name: 'sketch', label: 'Блок «План → каркас → дом» на «Построить» и у посёлков «скоро»', type: 'checkbox', defaultValue: true },
        { name: 'key', label: 'Веер фото свободных домов на «Готовых домах»', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
}
