import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ru } from '@payloadcms/translations/languages/ru'
import fs from 'fs'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Regions } from './collections/Regions'
import { Estates } from './collections/Estates'
import { Projects } from './collections/Projects'
import { Houses } from './collections/Houses'
import { Leads } from './collections/Leads'
import { Promos } from './collections/Promos'
import { Landings } from './collections/Landings'
import { Company } from './globals/Company'
import { Design } from './globals/Design'
import { Seo } from './globals/Seo'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Vercel (13.11, показ v4): файловая система там только для чтения, поэтому база едет вместе с сайтом и при запуске
// копируется во /tmp. Заявки и правки в админке на этой копии не сохраняются — это витрина для показа, не боевой сайт.
// Локально и на своём сервере ничего не меняется: берётся DATABASE_URL.
function dbUrl() {
  if (!process.env.VERCEL) return process.env.DATABASE_URL || ''
  const src = path.resolve(process.cwd(), 'platform.db')
  const tmp = '/tmp/platform.db'
  try {
    if (!fs.existsSync(tmp) && fs.existsSync(src)) fs.copyFileSync(src, tmp)
  } catch {
    // нет копии — Payload скажет об ошибке базы, это видно в логах Vercel
  }
  return `file:${tmp}`
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: { titleSuffix: ' · Хороший дом' },
    components: { beforeDashboard: ['/components/admin/Guide#Guide'] }, // «Как вести сайт» for the client's team
  },
  i18n: { supportedLanguages: { ru }, fallbackLanguage: 'ru' },
  collections: [Regions, Estates, Houses, Projects, Leads, Promos, Landings, Media, Users],
  globals: [Company, Design, Seo],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: dbUrl(),
    },
  }),
  sharp,
  plugins: [],
})
