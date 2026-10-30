// Picture from the image model → webp for the site: node tools/web_image.mjs <in> <out.webp> [max width] [quality]
import sharp from 'sharp'

const [input, output, width = '2560', quality = '84'] = process.argv.slice(2)
const info = await sharp(input)
  .resize({ width: Number(width), withoutEnlargement: true })
  .webp({ quality: Number(quality) })
  .toFile(output)
console.log(`${output}: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`)
