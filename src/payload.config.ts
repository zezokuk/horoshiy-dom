import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ru } from '@payloadcms/translations/languages/ru'
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
      url: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
