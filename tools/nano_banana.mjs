// Картинка из Nano Banana (Gemini API) для сайта.
//
//   node tools/nano_banana.mjs "<описание или @файл-с-промптом.md>" <выход.png> [опции]
//
// Опции:
//   --aspect 16:9        соотношение сторон (по умолчанию 16:9)
//   --size 2K            1K | 2K | 4K (К — заглавная; по умолчанию 2K)
//   --model <id>         по умолчанию gemini-nano-banana-2.1
//   --ref <файл>         референс-картинка (можно несколько раз, до 10)
//
// Ключ: GEMINI_API_KEY в окружении или в файле .env.local рядом с package.json
// (.env*.local уже в .gitignore, в репозиторий не уйдёт). Ключ нигде не печатается.
//
// Дальше для сайта: node tools/web_image.mjs <выход.png> <выход.webp>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com'

function readKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim()
  // рядом с package.json, откуда бы ни запустили скрипт
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.*)\s*$/)
      if (m) return m[1].replace(/^["']|["']$/g, '').trim()
    }
  }
  return ''
}

function parseArgs(argv) {
  const pos = []
  const opts = { aspect: '16:9', size: '2K', model: 'gemini-nano-banana-2.1', ref: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--aspect') opts.aspect = argv[++i]
    else if (a === '--size') opts.size = String(argv[++i]).toUpperCase() // API требует заглавную K
    else if (a === '--model') opts.model = argv[++i]
    else if (a === '--ref') opts.ref.push(argv[++i])
    else pos.push(a)
  }
  return { pos, opts }
}

// Ищем base64-картинку в ответе. Документация Google показывает два пути:
//   interaction.output_image.data (удобный доступ SDK) и
//   steps[type=model_output].content[type=image].data (полный ответ).
// Берём последнюю картинку из model_output; картинки из "thought" (черновики модели) пропускаем.
function collectImages(node, out, inThought = false) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const v of node) collectImages(v, out, inThought)
    return
  }
  if (node.type === 'image' && typeof node.data === 'string') out.push({ data: node.data, thought: inThought })
  for (const [k, v] of Object.entries(node)) {
    collectImages(v, out, inThought || node.type === 'thought' || k === 'summary')
  }
}

function findImageData(json) {
  if (json?.output_image && typeof json.output_image.data === 'string') return json.output_image.data
  const found = []
  collectImages(json, found)
  const final = found.filter((i) => !i.thought)
  return (final.length ? final : found).at(-1)?.data ?? null
}

const { pos, opts } = parseArgs(process.argv.slice(2))
if (pos.length < 2) {
  console.error('Использование: node tools/nano_banana.mjs "<описание или @файл.md>" <выход.png> [--aspect 16:9] [--size 2K] [--model id] [--ref файл]')
  process.exit(1)
}

let [prompt, out] = pos
if (prompt.startsWith('@')) prompt = fs.readFileSync(prompt.slice(1), 'utf8')
prompt = prompt.trim()
if (!prompt) {
  console.error('Пустое описание.')
  process.exit(1)
}

const key = readKey()
if (!key) {
  console.error('Нет ключа. Положите GEMINI_API_KEY=... в файл .env.local рядом с package.json (или задайте переменную окружения).')
  process.exit(1)
}

// API отдаёт только image/jpeg (проверено живым запросом: «Supported values: 'image/jpeg'»).
// Если просили .png или .webp — после получения конвертируем через sharp.
const ext = path.extname(out).toLowerCase()
const mime = 'image/jpeg'

let input = prompt
if (opts.ref.length) {
  input = [{ type: 'text', text: prompt }]
  for (const f of opts.ref) {
    const refExt = path.extname(f).toLowerCase()
    const refMime = refExt === '.png' ? 'image/png' : refExt === '.webp' ? 'image/webp' : 'image/jpeg'
    input.push({ type: 'image', mime_type: refMime, data: fs.readFileSync(f).toString('base64') })
  }
}

const body = {
  model: opts.model,
  input,
  response_format: { type: 'image', mime_type: mime, aspect_ratio: opts.aspect, image_size: opts.size },
}

const res = await fetch(`${BASE}/v1beta/interactions`, {
  method: 'POST',
  headers: {
    'x-goog-api-key': key,
    'Content-Type': 'application/json',
    'Api-Revision': '2026-05-20',
  },
  body: JSON.stringify(body),
})

const text = await res.text()
if (!res.ok) {
  console.error(`Ошибка ${res.status} от API:\n${text.slice(0, 800)}`)
  process.exit(2)
}

let json
try {
  json = JSON.parse(text)
} catch {
  console.error(`Ответ не JSON:\n${text.slice(0, 400)}`)
  process.exit(2)
}

const data = findImageData(json)
if (!data) {
  console.error(`В ответе нет картинки. Начало ответа:\n${text.slice(0, 800)}`)
  process.exit(3)
}

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
const bytes = Buffer.from(data, 'base64')
if (ext === '.png' || ext === '.webp') {
  const { default: sharp } = await import('sharp')
  await (ext === '.png' ? sharp(bytes).png() : sharp(bytes).webp({ quality: 90 })).toFile(out)
} else {
  fs.writeFileSync(out, bytes)
}
console.log(`${out}: ${Math.round(fs.statSync(out).size / 1024)} KB (${opts.model}, ${opts.aspect}, ${opts.size})`)
