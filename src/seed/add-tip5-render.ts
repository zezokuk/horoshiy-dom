/** Add the «Тип 5» plan render and room areas to a filled database (see tip5-render.ts). */
import { getPayload } from 'payload'
import config from '../payload.config'
import { addTip5Render } from './tip5-render'

const payload = await getPayload({ config })
console.log((await addTip5Render(payload)) ? 'Тип 5: render and rooms added' : 'Тип 5: nothing added (already has a render, or the project / render file is missing)')
process.exit(0)
