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
      defaultValue: 'hero-5',
      options: [
        { label: 'Vintara: дом в тон бренда перед названием', value: 'hero-5' },
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
        { label: 'Фирменные: тёмно-зелёный и золото', value: 'forest' },
        { label: 'Графит и латунь', value: 'graphite' },
        { label: 'Тёмно-синий и песок', value: 'navy' },
        { label: 'Тёплый: шоколад и терракота', value: 'terracotta' },
      ],
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
        { name: 'fan', label: '«Выберите проект» веером (выключено — сеткой карточек)', type: 'checkbox', defaultValue: true },
        { name: 'sketch', label: 'Блок «План → каркас → дом» на «Построить» и у посёлков «скоро»', type: 'checkbox', defaultValue: true },
        { name: 'key', label: 'Веер фото свободных домов на «Готовых домах»', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
}
