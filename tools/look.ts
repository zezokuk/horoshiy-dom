/**
 * Switch «Внешний вид» from the command line (the same fields as in the admin):
 *
 *   npx payload run tools/look.ts                 → v2 «Листва», first screen hero-6, «Кто строит» before the estates
 *   npx payload run tools/look.ts shalfey         → v2 «Шалфей»
 *   npx payload run tools/look.ts forest hero-5   → back to the dark brand look of 20.10
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

const [palette = 'listva', hero = palette === 'listva' || palette === 'shalfey' ? 'hero-6' : 'hero-5'] = process.argv.slice(2)
const payload = await getPayload({ config })
const d = await payload.updateGlobal({
  slug: 'design',
  data: { palette: palette as 'listva', hero: hero as 'hero-6', homeOrder: 'founder' },
})
console.log(`design: palette=${d.palette} hero=${d.hero} homeOrder=${d.homeOrder}`)
process.exit(0)
