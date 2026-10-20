/** Add the region's first-screen picture and its scene labels to a filled database (see region-scenes.ts). */
import { getPayload } from 'payload'
import config from '../payload.config'
import { addRegionScenes } from './region-scenes'

const payload = await getPayload({ config })
console.log((await addRegionScenes(payload)) ? 'krd: scenes and labels added' : 'krd: nothing added (already has scenes, or the region / picture is missing)')
process.exit(0)
