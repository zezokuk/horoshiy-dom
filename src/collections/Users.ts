import type { CollectionConfig } from 'payload'
import { adminOnly, isAdmin } from './access'

/** Staff accounts for the admin panel. Managers are tied to regions and see only their houses and leads. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Сотрудник', plural: 'Сотрудники' },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'name', 'role'], group: 'Настройки' },
  auth: true,
  hooks: {
    beforeChange: [
      // the very first account (created on /admin/create-first-user) must be an admin, otherwise nobody can manage the site
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req, overrideAccess: true })
          if (totalDocs === 0) data.role = 'admin'
        }
        return data
      },
    ],
  },
  access: {
    read: ({ req }) => (isAdmin(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false),
    create: adminOnly,
    update: ({ req }) => (isAdmin(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false),
    delete: adminOnly,
  },
  fields: [
    { name: 'name', label: 'Имя', type: 'text' },
    {
      name: 'role',
      label: 'Роль',
      type: 'select',
      required: true,
      defaultValue: 'manager',
      options: [
        { label: 'Администратор', value: 'admin' },
        { label: 'Менеджер региона', value: 'manager' },
      ],
      // nobody can raise their own role; only admins assign roles and regions
      access: { update: ({ req }) => isAdmin(req.user) },
      saveToJWT: true,
    },
    {
      name: 'regions',
      label: 'Регионы',
      type: 'relationship',
      relationTo: 'regions',
      hasMany: true,
      access: { update: ({ req }) => isAdmin(req.user) },
      saveToJWT: true,
    },
  ],
}
