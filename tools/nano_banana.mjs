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

const BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com'

function readKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim()
  const file = path.resolve('.env.local')
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
    else if (a === '--size') opts.size = argv[++i]
    else if (a === '--model') opts.model = argv[++i]
    else if (a === '--ref') opts.ref.push(argv[++i])
    else pos.push(a)
  }
  return { pos, opts }
}

// Ищем base64-картинку в ответе: сначала output_image.data, потом любое длинное поле data.
function findImageData(node) {
  if (node && typeof node === 'object') {
    if (node.output_image && typeof node.output_image.data === 'string') return node.output_image.data
    for (const v of Object.values(node)) {
      const r = findImageData(v)
      if (r) return r
    }
  }
  return null
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

const ext = path.extname(out).toLowerCase()
const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'

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
fs.writeFileSync(out, Buffer.from(data, 'base64'))
console.log(`${out}: ${Math.round(fs.statSync(out).size / 1024)} KB (${opts.model}, ${opts.aspect}, ${opts.size})`)
