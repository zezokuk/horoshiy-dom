import * as THREE from 'three'

/**
 * House geometry for the 3D master plan (Genplan3D). The build scroll scene (BuildHouse3D) uses its own GLB model.
 *
 * Materials follow the photo of the built house (05-эталон-настоящий-дом-фото.webp):
 * red brick #a0452e with dark clinker flecks (#4a3a36), graphite metal tile roof #4b4e54, graphite frames #2f3133.
 * If the developer chooses the beige look from their render instead, swap PALETTE.brick/wallStyle below.
 *
 * Everything is procedural CanvasTexture — no downloaded images. Houses are emitted as plain BufferGeometries
 * grouped by material (HouseGeoms.byMat) so the scene can merge all walls of all houses into one draw call.
 */

export const PALETTE = {
  brick: '#a0452e',
  clinker: '#4a3a36',
  brickLight: '#b5654a',
  joint: '#c4bcb0',
  roof: '#4b4e54',
  frame: '#2f3133',
  glass: '#7d919b',
  door: '#2f3133',
  plinth: '#413f3c',
  slab: '#b9b2a7',
  trim: '#2f3133',
  gutter: '#33363b',
  lawn: '#8fa676',
  paving: '#cfc6b6',
  fence: '#f1ece2',
}

/** Deterministic pseudo-random from a number or a string seed (one project type looks the same on every plot). */
export function rand(seed: number | string) {
  const s = typeof seed === 'string' ? seed.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) : seed
  const x = Math.sin(s * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

type Ctx = CanvasRenderingContext2D

function makeTex(w: number, h: number, draw: (g: Ctx) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const g = cv.getContext('2d')!
  draw(g)
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Кирпич: ряды ~250×60 со швом ~10, ~8% тёмного клинкера. Тайл 3.12×3.12 м = 12 кирпичей × 44 ряда. */
export function brickTexture(): THREE.CanvasTexture {
  return makeTex(512, 512, (g) => {
    g.fillStyle = '#b3aa9e'
    g.fillRect(0, 0, 512, 512)
    const rows = 44
    const bw = 512 / 12 // 12 кирпичей в ряду
    const bh = 512 / rows
    const bwReal = bw - 1.2
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bw / 2 : 0
      for (let x = -bw; x < 512 + bw; x += bw) {
        const i = r * 131 + Math.round(x)
        const k = rand(i)
        const v = 0.92 + rand(i + 1.7) * 0.16
        const [br, bg, bb] = [0xa0, 0x45, 0x2e].map((c) => Math.round(Math.min(255, c * v)))
        g.fillStyle = k < 0.08 ? PALETTE.clinker : k < 0.14 ? PALETTE.brickLight : k > 0.97 ? `rgb(${br - 22},${bg - 12},${bb - 8})` : `rgb(${br},${bg},${bb})`
        g.fillRect(x + off + 1, r * bh + 1, bwReal, bh - 2)
        if (rand(i + 3) < 0.4) {
          g.fillStyle = 'rgba(0,0,0,0.07)'
          g.fillRect(x + off + 3 + rand(i + 5) * (bwReal - 14), r * bh + 2 + rand(i + 7) * (bh - 6), 9, 2)
        }
      }
    }
  })
}

/** Металлочерепица: вертикальные листы с горизонтальным рельефом рядов. Тайл = 2×2 м. */
export function roofTexture(): THREE.CanvasTexture {
  return makeTex(256, 256, (g) => {
    g.fillStyle = PALETTE.roof
    g.fillRect(0, 0, 256, 256)
    for (let x = 0; x < 256; x += 32) {
      // лист: свет слева, тень справа
      const gr = g.createLinearGradient(x, 0, x + 32, 0)
      gr.addColorStop(0, 'rgba(255,255,255,0.13)')
      gr.addColorStop(0.5, 'rgba(255,255,255,0)')
      gr.addColorStop(1, 'rgba(0,0,0,0.22)')
      g.fillStyle = gr
      g.fillRect(x, 0, 32, 256)
    }
    for (let y = 0; y < 256; y += 28) {
      g.fillStyle = 'rgba(0,0,0,0.28)'
      g.fillRect(0, y, 256, 2.5)
      g.fillStyle = 'rgba(255,255,255,0.07)'
      g.fillRect(0, y + 2.5, 256, 2)
    }
  })
}

/** Газон: шумовые пятна. */
export function lawnTexture(): THREE.CanvasTexture {
  return makeTex(256, 256, (g) => {
    g.fillStyle = '#93ac6f'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 800; i++) {
      const x = rand(i * 1.7) * 256
      const y = rand(i * 3.1) * 256
      const r = 2 + rand(i * 5.3) * 8
      const k = rand(i * 7.9)
      g.fillStyle = k < 0.45 ? 'rgba(111,132,80,0.35)' : k < 0.8 ? 'rgba(150,168,105,0.3)' : 'rgba(190,185,120,0.2)'
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
    }
  })
}

/** Тротуарная плитка. */
export function paverTexture(): THREE.CanvasTexture {
  return makeTex(128, 128, (g) => {
    g.fillStyle = '#b7ab96'
    g.fillRect(0, 0, 128, 128)
    const ph = 32
    for (let y = 0; y < 128; y += ph) {
      for (let x = 0; x < 128; x += 64) {
        const v = 0.9 + rand(x + y) * 0.2
        const [r, gg, b] = [0xb7, 0xab, 0x96].map((c) => Math.round(c * v))
        g.fillStyle = `rgb(${r},${gg},${b})`
        g.fillRect(x + ((y / ph) % 2 ? 32 : 0) - 32 + 1, y + 1, 62, ph - 2)
        g.fillRect(x + ((y / ph) % 2 ? 32 : 0) + 32 + 1, y + 1, 62, ph - 2)
      }
    }
  })
}

/** Пересчёт UV бокса в метры: кирпич одного размера на любой стене. Box: 24 вершины, по 4 на грань (+x,-x,+y,-y,+z,-z). */
export function metricBoxUV(geo: THREE.BoxGeometry, scale = 3.12) {
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  const uv = new Float32Array((pos.count * 2) as number)
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i))
    const ny = Math.abs(nor.getY(i))
    let u: number
    let v: number
    if (nx > 0.5) {
      u = pos.getZ(i)
      v = pos.getY(i)
    } else if (ny > 0.5) {
      u = pos.getX(i)
      v = pos.getZ(i)
    } else {
      u = pos.getX(i)
      v = pos.getY(i)
    }
    uv[i * 2] = u / scale
    uv[i * 2 + 1] = v / scale
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geo
}

/** Геометрия вальмовой крыши + плановая UV (для черепицы). @param a по X, @param b по Z. */
export function hipRoofGeometry(a: number, b: number, h: number) {
  const long = a >= b
  const L = long ? a : b
  const D = long ? b : a
  const r = Math.max(0, L / 2 - D / 2)
  const p = (x: number, y: number, z: number) => (long ? [x, y, z] : [z, y, x])
  const v = [...p(-L / 2, 0, -D / 2), ...p(L / 2, 0, -D / 2), ...p(L / 2, 0, D / 2), ...p(-L / 2, 0, D / 2), ...p(-r, h, 0), ...p(r, h, 0)]
  const idx = [0, 4, 5, 0, 5, 1, 2, 5, 4, 2, 4, 3, 1, 5, 2, 3, 4, 0]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  g.setIndex(long ? idx : idx.slice().reverse())
  g.computeVertexNormals()
  // плановая проекция: черепица «раскатывается» по скату как по земле
  const uv = new Float32Array(12)
  for (let i = 0; i < 6; i++) {
    uv[i * 2] = (long ? v[i * 3] : v[i * 3 + 2]) / 2
    uv[i * 2 + 1] = (long ? v[i * 3 + 2] : v[i * 3]) / 2
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}

export type MatKey = 'wall' | 'plinth' | 'roof' | 'frame' | 'glass' | 'door' | 'slab' | 'trim'
export type HouseGeoms = { byMat: Map<MatKey, THREE.BufferGeometry[]>; height: number }

/** Все геометрии дома складываются сюда; вызывающий потом мержит по материалам. */
function collect(): HouseGeoms {
  return { byMat: new Map(), height: 0 }
}
function put(h: HouseGeoms, mat: MatKey, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rotY = 0) {
  if (rotY) geo.rotateY(rotY)
  if (x || y || z) geo.translate(x, y, z)
  if (!h.byMat.has(mat)) h.byMat.set(mat, [])
  h.byMat.get(mat)!.push(geo)
}

const boxCache = new Map<string, THREE.BoxGeometry>()
function box(w: number, h: number, d: number) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`
  let g = boxCache.get(key)
  if (!g) boxCache.set(key, (g = metricBoxUV(new THREE.BoxGeometry(w, h, d)) as THREE.BoxGeometry))
  return g.clone() // мерж мутирует трансформ, поэтому клонируем из кэша
}
const roofCache = new Map<string, THREE.BufferGeometry>()
function roof(a: number, b: number, h: number) {
  const key = `${a.toFixed(3)}|${b.toFixed(3)}|${h.toFixed(3)}`
  let g = roofCache.get(key)
  if (!g) roofCache.set(key, (g = hipRoofGeometry(a, b, h)))
  return g.clone()
}

/** Окно: графитовая рама + стекло + перекладина; отлив под окном. */
function windowAt(h: HouseGeoms, w: number, ht: number, x: number, y: number, z: number, rotY: number) {
  const frame = new THREE.BoxGeometry(w + 0.16, ht + 0.16, 0.1)
  metricBoxUV(frame as unknown as THREE.BoxGeometry)
  put(h, 'frame', frame, x, y, z, rotY)
  const glass = new THREE.BoxGeometry(w, ht, 0.14)
  put(h, 'glass', glass, x, y, z, rotY)
  const bar = new THREE.BoxGeometry(0.05, ht, 0.12)
  put(h, 'frame', bar, x, y, z, rotY)
  const sill = new THREE.BoxGeometry(w + 0.24, 0.07, 0.18)
  put(h, 'trim', sill, x, y - ht / 2 - 0.1, z, rotY)
}

/** Слуховое окно на скате крыши (мансарда). */
function dormerAt(h: HouseGeoms, w: number, ht: number, dd: number, x: number, y: number, z: number, side: 1 | -1) {
  put(h, 'wall', box(w, ht, dd), x, y + ht / 2, z)
  put(h, 'roof', roof(w + 0.4, dd + 0.4, 0.6), x, y + ht, z)
  windowAt(h, w * 0.5, ht * 0.55, x, y + ht / 2, z + side * (dd / 2 + 0.02), side === 1 ? 0 : Math.PI)
}

/** Вход: графитовая дверь, кирпичные столбы (по фото 05 — не белые колонны), козырёк, ступени. Локальные координаты, front = +Z. */
function entrance(h: HouseGeoms, base: number, x: number, z: number) {
  const door = new THREE.BoxGeometry(1.0, 2.1, 0.12)
  metricBoxUV(door as unknown as THREE.BoxGeometry)
  put(h, 'door', door, x, base + 1.05, z)
  for (const px of [-1.15, 1.15]) {
    put(h, 'wall', box(0.34, 2.6, 0.34), x + px, base + 1.3, z + 0.85)
  }
  put(h, 'trim', box(2.9, 0.1, 1.5), x, base + 2.62, z + 0.55) // козырёк
  put(h, 'slab', box(2.6, 0.18, 1.2), x, base - 0.09, z + 0.45) // ступени
}

/** Водостоки: две трубы по торцам и желоб по нижней кромке крыши. */
function gutters(h: HouseGeoms, a: number, b: number, wallH: number, base: number) {
  const gh = wallH + 0.55
  for (const sx of [-1, 1]) {
    put(h, 'trim', box(0.13, gh, 0.13), (sx * (a + 0.6)) / 2, base + gh / 2, (b + 0.5) / 2)
    put(h, 'trim', box(0.13, gh, 0.13), (sx * (a + 0.6)) / 2, base + gh / 2, -(b + 0.5) / 2)
  }
}

export type HouseKind = 'straight' | 'gshape' | 'terrace'

/** Форма дома определяется типом проекта (unit.title), а не номером участка: один тип везде одинаковый. */
export function houseKindFor(title: string | undefined, storeys: 1 | 2, attic: boolean): HouseKind {
  const t = (title ?? '').toLowerCase()
  if (storeys === 2) return 'straight' // двухэтажные — прямоугольные блоки
  const k = rand(t + ':kind')
  if (attic && k < 0.34) return 'gshape'
  if (k >= 0.34 && k < 0.67) return 'terrace'
  return 'straight'
}

/**
 * Геометрии одного дома, уже в локальных координатах (front = +Z, низ на y=0 над плитой).
 * @param a ширина по X, @param b глубина по Z.
 */
export function buildHouseGeoms(a: number, b: number, storeys: 1 | 2, attic: boolean, kind: HouseKind, seed: string): HouseGeoms {
  const h = collect()
  const base = 0.4
  const wallH = storeys === 2 ? 5.8 : attic ? 3.9 : 3.0

  // фундамент и цоколь
  put(h, 'slab', box(a + 0.5, base, b + 0.5), 0, base / 2, 0)
  put(h, 'plinth', box(a + 0.1, 0.55, b + 0.1), 0, base + 0.27, 0)

  if (kind === 'gshape') {
    // Г-образный: основной объём + крыло по правой стороны, ниша входа спереди слева
    const wing = a * 0.42
    const mainD = b * 0.62
    put(h, 'wall', box(a, wallH, mainD), 0, base + wallH / 2, (b - mainD) / 2 - 0)
    put(h, 'wall', box(wing, wallH, b), a / 2 - wing / 2, base + wallH / 2, 0)
    const roofH = Math.min(a, b) * 0.38
    put(h, 'roof', roof(a + 0.9, mainD + 0.9, roofH), 0, base + wallH, (b - mainD) / 2)
    put(h, 'roof', roof(wing + 0.9, b + 0.9, roofH * 0.94), a / 2 - wing / 2, base + wallH, 0)
    put(h, 'trim', box(a + 0.95, 0.12, mainD + 0.95), 0, base + wallH + 0.02, (b - mainD) / 2) // карниз
    put(h, 'trim', box(wing + 0.95, 0.12, b + 0.95), a / 2 - wing / 2, base + wallH + 0.02, 0)
    // окна: фасад крыла, торец крыла, тыл основного объёма
    windowAt(h, 1.5, 1.3, -a / 4, base + 1.6, b / 2 + 0.02, 0)
    windowAt(h, 1.3, 1.3, a / 2 + 0.02, base + 1.6, -b / 4, Math.PI / 2)
    windowAt(h, 1.3, 1.3, a / 2 - wing - 0.02, base + 1.6, b / 2 - 0.02, 0)
    windowAt(h, 1.3, 1.3, 0, base + 1.6, -b / 2 - 0.02, Math.PI)
    windowAt(h, 1.1, 1.3, -a / 2 - 0.02, base + 1.6, 0, -Math.PI / 2)
    // вход в нише (слева, фасад)
    entrance(h, base, -a / 2 + wing / 2 + 0.6, b / 2 - 0.35)
    gutters(h, a, b, wallH, base)
    h.height = base + wallH + Math.min(a, b) * 0.38
    return h
  }

  // straight / terrace — прямоугольный объём
  put(h, 'wall', box(a, wallH, b), 0, base + wallH / 2, 0)
  if (storeys === 2) put(h, 'trim', box(a + 0.12, 0.16, b + 0.12), 0, base + wallH / 2, 0) // перевязка этажей
  const roofH = Math.min(a, b) * (attic ? 0.6 : 0.36)
  put(h, 'roof', roof(a + 0.9, b + 0.9, roofH), 0, base + wallH, 0)
  put(h, 'trim', box(a + 0.95, 0.12, b + 0.95), 0, base + wallH + 0.02, 0) // карниз
  gutters(h, a, b, wallH, base)

  if (attic) {
    const dw = Math.min(2.4, a * 0.3)
    const dh = Math.min(1.6, roofH * 0.45)
    const dd = 1.8
    for (const side of [1, -1] as const) {
      const z = side * (b / 2 - dd / 2 + 0.3)
      dormerAt(h, dw, dh, dd, 0, base + wallH, z, side)
    }
  }

  // окна: два на фасад, три сзади, по бокам пара
  const floors = storeys === 2 ? [base + 1.6, base + 1.6 + wallH / 2] : [base + 1.6]
  for (const y of floors) {
    for (const fx of [-0.32, 0.32]) windowAt(h, Math.min(1.5, a * 0.14), 1.3, fx * a, y, b / 2 + 0.02, 0)
    for (const fx of [-0.3, 0, 0.3]) windowAt(h, Math.min(1.5, a * 0.14), 1.3, fx * a, y, -b / 2 - 0.02, Math.PI)
    for (const fz of [-0.22, 0.22]) {
      windowAt(h, Math.min(1.4, b * 0.12), 1.3, a / 2 + 0.02, y, fz * b, Math.PI / 2)
      windowAt(h, Math.min(1.4, b * 0.12), 1.3, -a / 2 - 0.02, y, fz * b, -Math.PI / 2)
    }
  }

  if (kind === 'terrace') {
    // крытая терраса сзади: плита на кирпичных столбиках + плоская крышка под основной скат
    const tw = Math.min(a * 0.55, 4.4)
    const td = 2.2
    const tz = -b / 2 - td / 2 + 0.1
    put(h, 'slab', box(tw, 0.14, td), 0, base + 0.07, tz)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      put(h, 'wall', box(0.3, 2.5, 0.3), (sx * (tw - 0.5)) / 2, base + 1.25, tz + (sz * (td - 0.5)) / 2)
    }
    put(h, 'trim', box(tw + 0.3, 0.1, td + 0.3), 0, base + 2.55, tz)
  }

  // вход по центру фасада
  entrance(h, base, 0, b / 2 + 0.03)

  h.height = base + wallH + roofH
  return h
}

/** Дом «нет в продаже» приглушён: та же геометрия, материалы сереют на стороне сцены. */
export const DIM_TINT = '#b8b2a6'
