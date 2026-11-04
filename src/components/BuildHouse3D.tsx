'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { FLOORS, FURNITURE, PLAN_CENTER, PLANTS, PX_PER_M, TERRACE, WALLS } from '@/lib/tip5-plan'

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const phase = (p: number, from: number, to: number) => clamp((p - from) / (to - from))
const ease = (k: number) => 1 - Math.pow(1 - k, 3)

/** Start of each step, 0..1 of the build (BuildStory's ENDS: the end of each step; keep them in sync). */
const BUILD_STEPS = [0, 0.03, 0.16, 0.36, 0.52, 0.64]

// plan pixels → metres around the plan centre; the plan's bottom (the porch) faces +Z
const mx = (px: number) => (px - PLAN_CENTER.x) / PX_PER_M
const mz = (py: number) => (py - PLAN_CENTER.y) / PX_PER_M

const H = 2.9 // wall height
const SLAB = 0.3 // foundation slab
const ROOF_CUT = 3.0 // GLB: всё выше — крыша (стены «Типа 5» ровно 3 м)
const WALL_BASE = 0.34 // GLB: цоколь/фундамент модели — его не показываем, у нас своя плита

/** Real-material colours (эталон — фото построенного дома; палитра как в ТЗ на генплан). */
const C = {
  sketch: '#fbf8f2',
  wall: '#f4efe6',
  cut: '#efe6d6',
  line: '#3b3a35',
  slab: '#cfc8bb',
  oak: '#caa271',
  deck: '#a9805c',
  sand: '#e0d3b8',
  soil: '#7a5c42',
  leaf: '#6f8450',
  leafLight: '#86a05e',
  leafDark: '#5a6f42',
  trunk: '#6b5444',
  hedge: '#64794a',
  white: '#f7f4ee',
  oat: '#e2d6c2',
  linen: '#f3eee4',
  walnut: '#6b4a30',
  olive: '#55613f',
  rug: '#e9dfcc',
  flowerRed: '#c1503f',
  flowerYellow: '#e0b23c',
  paver: '#c4b9a4',
}

/** Deterministic pseudo-random from an integer (stable across renders). */
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

type Ctx = CanvasRenderingContext2D

/** All textures are procedural CanvasTexture (no downloaded images). */
function makeTex(w: number, h: number, draw: (g: Ctx) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const g = cv.getContext('2d')!
  draw(g)
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** Газон: шумовые пятна травы; материал красит его из песка в зелень. */
function lawnTexture(): THREE.CanvasTexture {
  return makeTex(256, 256, (g) => {
    g.fillStyle = '#9db374'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 900; i++) {
      const x = rand(i * 1.7) * 256
      const y = rand(i * 3.1) * 256
      const r = 2 + rand(i * 5.3) * 9
      const t = rand(i * 7.9)
      g.fillStyle = t < 0.45 ? 'rgba(111,132,80,0.35)' : t < 0.8 ? 'rgba(150,168,105,0.3)' : 'rgba(190,185,120,0.22)'
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
    }
  })
}

/** Доски террасы вдоль X. */
function plankTexture(): THREE.CanvasTexture {
  return makeTex(256, 128, (g) => {
    g.fillStyle = '#a9805c'
    g.fillRect(0, 0, 256, 128)
    const ph = 21
    for (let y = 0; y < 128; y += ph) {
      const v = 0.88 + rand(y * 13) * 0.24
      const [r, gg, b] = [0xa9, 0x80, 0x5c].map((c) => Math.round(c * v))
      g.fillStyle = `rgb(${r},${gg},${b})`
      g.fillRect(0, y, 256, ph - 2)
      g.fillStyle = 'rgba(60,40,25,0.5)'
      g.fillRect(0, y + ph - 2, 256, 2)
      for (let i = 0; i < 6; i++) {
        g.fillStyle = 'rgba(80,55,35,0.25)' // волокна
        g.fillRect(rand(y + i) * 256, y + 3 + rand(i * 3 + y) * (ph - 8), 30 + rand(i) * 60, 1)
      }
    }
  })
}

/** Грунт в разрезе подложки-диорамы. */
function soilTexture(): THREE.CanvasTexture {
  return makeTex(128, 128, (g) => {
    g.fillStyle = '#7a5c42'
    g.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 500; i++) {
      const v = 0.8 + rand(i * 1.3) * 0.45
      const [r, gg, b] = [0x7a, 0x5c, 0x42].map((c) => Math.round(clamp(c * v, 0, 255)))
      g.fillStyle = `rgb(${r},${gg},${b})`
      g.fillRect(rand(i * 2.1) * 128, rand(i * 4.7) * 128, 2 + rand(i) * 4, 1 + rand(i * 2) * 3)
    }
  })
}

/** Плитняк дорожки. */
function paverTexture(): THREE.CanvasTexture {
  return makeTex(128, 128, (g) => {
    g.fillStyle = '#b7ab96'
    g.fillRect(0, 0, 128, 128)
    const s = 32
    for (let ry = 0; ry < 4; ry++) {
      for (let rx = 0; rx < 4; rx++) {
        const v = 0.82 + rand(ry * 17 + rx) * 0.2
        const [r, gg, b] = [0xc4, 0xb9, 0xa4].map((c) => Math.round(c * v))
        g.fillStyle = `rgb(${r},${gg},${b})`
        g.fillRect(rx * s + 2, ry * s + 2, s - 4, s - 4)
      }
    }
  })
}

/** Кирпич для столбов забора: ряды со сдвигом, клинкерные вкрапления. */
function brickTexture(): THREE.CanvasTexture {
  return makeTex(256, 256, (g) => {
    const bw = 62
    const bh = 26
    const joint = 4
    g.fillStyle = '#c9bfb2' // шов
    g.fillRect(0, 0, 256, 256)
    for (let row = 0; row * (bh + joint) < 256 + bh; row++) {
      const y = row * (bh + joint)
      const off = row % 2 ? -(bw + joint) / 2 : 0
      for (let x = off; x < 256 + bw; x += bw + joint) {
        const r = rand(row * 97 + x)
        const clinker = r > 0.86
        const v = 0.82 + rand(row * 31 + x * 7) * 0.36
        const base = clinker ? [0x4a, 0x3a, 0x36] : [0xa0, 0x45, 0x2e]
        const [cr, cg, cb] = base.map((c) => Math.round(clamp(c * v, 0, 255)))
        g.fillStyle = `rgb(${cr},${cg},${cb})`
        g.fillRect(x, y, bw, bh)
      }
    }
  })
}

/** UV BoxGeometry 0..1 на грань → метры: кирпич одного размера на любой грани. */
function metricBoxUV(geo: THREE.BoxGeometry, w: number, h: number, d: number, scale = 1) {
  const uv = geo.attributes.uv as THREE.BufferAttribute
  const face = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ]
  for (let f = 0; f < 6; f++) {
    const [fw, fh] = face[f]
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v
      uv.setXY(i, uv.getX(i) * fw * scale, uv.getY(i) * fh * scale)
    }
  }
  uv.needsUpdate = true
}

/** Ковёр с каймой. */
function rugTexture(): THREE.CanvasTexture {
  return makeTex(128, 128, (g) => {
    g.fillStyle = '#e9dfcc'
    g.fillRect(0, 0, 128, 128)
    g.strokeStyle = '#c9b494'
    g.lineWidth = 8
    g.strokeRect(10, 10, 108, 108)
    g.strokeStyle = 'rgba(160,69,46,0.55)'
    g.lineWidth = 3
    g.strokeRect(24, 24, 80, 80)
  })
}

/**
 * Scroll-driven construction of the «Тип 5» house: the GLB model from Kimi 3D Make, sliced by height into
 * walls/roof/glass so the build stages work as before, and a procedural interior (floor, furniture, plants)
 * revealed when the roof lifts like a dollhouse lid. `progress` (0..1) comes from the sticky section.
 * The plot, yard and camera are ours; the house itself is the client's real architecture.
 */
export default function BuildHouse3D({ progress, shift }: { progress: { current: number }; shift?: { x: number; y: number } }) {
  const host = useRef<HTMLDivElement>(null)
  // where the house sits in the frame (fractions of the canvas): right of a text column, or above cards on a phone
  const shiftRef = useRef(shift)
  useEffect(() => {
    shiftRef.current = shift
  })

  useEffect(() => {
    const el = host.current
    if (!el) return
    const textures: THREE.Texture[] = []
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    const small = el.clientWidth < 700
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = 1.0
    el.appendChild(renderer.domElement)

    const labels = new CSS2DRenderer()
    labels.setSize(el.clientWidth, el.clientHeight)
    labels.domElement.className = 'build3d__labels'
    el.appendChild(labels.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#efe9da', 55, 130) // мягкая дымка к краю диорамы
    // комнатное окружение: без него металл (крыша, фурнитура) и стёкла рендерятся чёрными
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.55
    pmrem.dispose()
    const camera = new THREE.PerspectiveCamera(28, el.clientWidth / el.clientHeight, 0.1, 300)
    const frame = (w: number, h: number) => {
      camera.aspect = w / h
      const s = shiftRef.current
      if (s) camera.setViewOffset(w, h, -s.x * w, s.y * h, w, h)
      else camera.clearViewOffset()
      camera.updateProjectionMatrix()
    }
    frame(el.clientWidth, el.clientHeight)

    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())

    // свет: тёплое солнце через плечо + мягкий небесный залив
    scene.add(new THREE.HemisphereLight('#f2f6ff', '#b6ad93', 0.95))
    const sun = new THREE.DirectionalLight('#fff1dc', 1.9)
    sun.position.set(-14, 24, 12)
    sun.castShadow = true
    sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.02
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 80 })
    scene.add(sun)

    const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra })
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], shadow = true) => {
      const m = new THREE.Mesh(geo, mat)
      m.castShadow = shadow
      m.receiveShadow = true
      return m
    }

    // ---------- наши процедурные текстуры (участок и интерьер) ----------
    const lawnTex = lawnTexture()
    const plankTex = plankTexture()
    const soilTex = soilTexture()
    const paverTex = paverTexture()
    const rugTex = rugTexture()
    const brickTex = brickTexture()
    brickTex.repeat.set(1, 1)
    textures.push(lawnTex, plankTex, soilTex, paverTex, rugTex, brickTex)
    for (const t of textures) t.anisotropy = aniso

    // the paper: only shadows fall on it, the page gradient shows through
    const shadowGround = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.15 }))
    shadowGround.rotation.x = -Math.PI / 2
    shadowGround.position.y = -0.52
    shadowGround.receiveShadow = true
    scene.add(shadowGround)

    // the plot: a diorama base, soil sides, sand-lawn top
    const lawnMat = new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 1 })
    const soilMat = new THREE.MeshStandardMaterial({ map: soilTex, roughness: 1 })
    const plot = mesh(new THREE.BoxGeometry(23, 0.5, 22), [soilMat, soilMat, lawnMat, soilMat, soilMat, soilMat], false)
    plot.position.set(0, -0.25, 0.6)
    lawnTex.repeat.set(5, 5)
    soilTex.repeat.set(6, 1)
    scene.add(plot)

    // 1. the plan drawn on the plot: wall outlines
    const planPts: THREE.Vector3[] = []
    const rectLine = (x1: number, z1: number, x2: number, z2: number, y = 0.01) => {
      const c = [new THREE.Vector3(x1, y, z1), new THREE.Vector3(x2, y, z1), new THREE.Vector3(x2, y, z2), new THREE.Vector3(x1, y, z2)]
      for (let i = 0; i < 4; i++) planPts.push(c[i], c[(i + 1) % 4])
    }
    for (const w of WALLS) {
      const horiz = w.a[1] === w.b[1]
      const h = w.t / 2
      if (horiz) rectLine(mx(w.a[0]), mz(w.a[1] - h), mx(w.b[0]), mz(w.a[1] + h))
      else rectLine(mx(w.a[0] - h), mz(w.a[1]), mx(w.a[0] + h), mz(w.b[1]))
    }
    rectLine(mx(TERRACE[0]), mz(TERRACE[1]), mx(TERRACE[2]), mz(TERRACE[3]))
    const planMat = new THREE.LineBasicMaterial({ color: '#2f4b3a', transparent: true })
    const plan = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(planPts), planMat)
    scene.add(plan)

    // 2. foundation slab (scales up) with the floor on top (concrete → oak)
    const foundation = new THREE.Group()
    const slabMat = std(C.slab)
    const floorMat = std(C.slab, { roughness: 0.7 })
    for (const [x1, y1, x2, y2] of FLOORS) {
      const w = mx(x2) - mx(x1)
      const d = mz(y2) - mz(y1)
      const s = mesh(new THREE.BoxGeometry(w, SLAB, d), [slabMat, slabMat, floorMat, slabMat, slabMat, slabMat])
      s.position.set((mx(x1) + mx(x2)) / 2, SLAB / 2, (mz(y1) + mz(y2)) / 2)
      foundation.add(s)
    }
    scene.add(foundation)

    // ---------- дом из GLB: стены / крыша / стёкла (разрез по высоте) ----------
    const houseWalls = new THREE.Group() // стены, растут со стадии 2
    houseWalls.position.y = WALL_BASE
    const houseRoof = new THREE.Group() // крыша, опускается на стадии 3, в финале снимается
    const houseGlass = new THREE.Group() // стёкла, стадия 4
    scene.add(houseWalls, houseRoof, houseGlass)

    const sketch = new THREE.Color(C.sketch)
    const houseWallMats: THREE.MeshStandardMaterial[] = []
    const houseRoofMats: THREE.MeshStandardMaterial[] = []
    let modelReady = false

    new GLTFLoader().load(
      '/models/khoroshiy-dom-type5.glb',
      (gltf) => {
        const root = gltf.scene
        const toDispose: THREE.BufferGeometry[] = []
        root.updateMatrixWorld(true)
        root.traverse((o) => {
          const m = o as THREE.Mesh
          if (!m.isMesh) return
          const geo = m.geometry
          toDispose.push(geo)
          const mats = Array.isArray(m.material) ? m.material : [m.material]
          const groups = geo.groups.length
            ? geo.groups.map((g) => [g.start, g.start + g.count, g.materialIndex ?? 0] as const)
            : ([[0, geo.attributes.position.count, 0]] as const)
          const pos = geo.attributes.position
          const nor = geo.attributes.normal
          const uv = geo.attributes.uv
          const index = geo.index
          const vcount = index ? index.count : pos.count
          const buckets = new Map<string, { mat: THREE.Material; arr: number[] }>()
          const read = (i: number, attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => [attr.getX(i), attr.getY(i), attr.getZ(i)]
          for (const [g0, g1, mi] of groups) {
            const mat = mats[mi] as THREE.MeshStandardMaterial
            for (let i = g0; i < g1; i += 3) {
              const tri = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k))
              const yc = (pos.getY(tri[0]) + pos.getY(tri[1]) + pos.getY(tri[2])) / 3
              let bucket = 'skip'
              if (mat.transparent) bucket = 'glass'
              else if (yc >= ROOF_CUT) bucket = 'roof'
              else if (yc >= WALL_BASE) bucket = 'walls'
              if (bucket === 'skip') continue
              const key = bucket + ':' + mi
              if (!buckets.has(key)) buckets.set(key, { mat, arr: [] })
              const { arr } = buckets.get(key)!
              for (const v of tri) {
                const p = read(v, pos)
                const n = read(v, nor)
                arr.push(p[0], p[1], p[2], n[0], n[1], n[2], uv ? uv.getX(v) : 0, uv ? uv.getY(v) : 0)
              }
            }
          }
          // world matrix модели (у нас — единичная, но применим для честности)
          const wm = m.matrixWorld
          for (const [key, { mat, arr }] of buckets) {
            const g = new THREE.BufferGeometry()
            g.setAttribute('position', new THREE.Float32BufferAttribute(arr.filter((_, i) => i % 8 < 3), 3))
            g.setAttribute('normal', new THREE.Float32BufferAttribute(arr.filter((_, i) => i % 8 >= 3 && i % 8 < 6), 3))
            g.setAttribute('uv', new THREE.Float32BufferAttribute(arr.filter((_, i) => i % 8 >= 6), 2))
            g.applyMatrix4(wm)
            g.computeBoundingSphere()
            const mm = mat.clone() as THREE.MeshStandardMaterial
            if (mm.map) mm.map.anisotropy = aniso
            if (key.startsWith('walls') || key.startsWith('roof')) {
              mm.side = THREE.DoubleSide // внутренние грани стен видно из кукольного среза
              if (key.startsWith('roof')) {
                mm.metalness = 0.05 // металлочерепица без яркого неба уходит в чёрный — глушим металл
                mm.roughness = Math.max(0.55, mm.roughness)
                houseRoofMats.push(mm)
              } else houseWallMats.push(mm)
            }
            const nm = new THREE.Mesh(g, mm)
            nm.castShadow = true
            nm.receiveShadow = true
            if (key.startsWith('walls')) houseWalls.add(nm)
            else if (key.startsWith('roof')) {
              nm.position.y = -ROOF_CUT // пивот крыши — по нижней кромке, чтобы рост шёл от конька вверх
              houseRoof.add(nm)
            } else houseGlass.add(nm)
          }
        })
        toDispose.forEach((g) => g.dispose())
        modelReady = true
      },
      undefined,
      () => {
        console.error('BuildHouse3D: GLB not loaded') // локальный ассет; падение видно в консоли
      },
    )

    // 5. moving in: terrace deck, furniture, plants, двор
    const deckMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.8 })
    plankTex.repeat.set(4, 4)
    const deckGeo = new THREE.BoxGeometry(mx(TERRACE[2]) - mx(TERRACE[0]), 0.16, mz(TERRACE[3]) - mz(TERRACE[1]))
    const deck = mesh(deckGeo, deckMat, false)
    deck.position.set((mx(TERRACE[0]) + mx(TERRACE[2])) / 2, 0.08, (mz(TERRACE[1]) + mz(TERRACE[3])) / 2)
    scene.add(deck)
    const fMats = {
      oat: std(C.oat),
      linen: std(C.linen),
      walnut: std(C.walnut, { roughness: 0.6 }),
      olive: std(C.olive),
      white: std(C.white, { roughness: 0.5 }),
      rug: new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }),
    }
    const pieces: THREE.Object3D[] = []
    for (const [x1, y1, x2, y2, h, m] of FURNITURE) {
      const w = mx(x2) - mx(x1)
      const d = mz(y2) - mz(y1)
      const rounded = Math.min(0.05, w * 0.2, h * 0.4)
      const p = mesh(new RoundedBoxGeometry(w, h, d, 2, rounded), fMats[m], h > 0.05)
      p.geometry.translate(0, h / 2, 0) // grow from the floor
      const onTerrace = y2 <= TERRACE[3] && x2 <= TERRACE[2]
      p.position.set((mx(x1) + mx(x2)) / 2, onTerrace ? 0.16 : SLAB, (mz(y1) + mz(y2)) / 2)
      scene.add(p)
      pieces.push(p)
      if (h > 0.45 && (m === 'oat' || m === 'walnut')) {
        // мягкая подушка на диване/кресле/кровати
        const c = mesh(new RoundedBoxGeometry(w * 0.86, 0.14, d * 0.8, 2, 0.06), std(C.linen), false)
        c.geometry.translate(0, 0.07, 0)
        c.position.set(p.position.x, p.position.y + h, p.position.z)
        scene.add(c)
        pieces.push(c)
      }
    }
    // комнатные растения
    const pot = std('#d9cdb8')
    for (const [x, y, s] of PLANTS) {
      const g = new THREE.Group()
      const potM = mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 16), pot)
      potM.position.y = 0.2
      const crown = mesh(new THREE.SphereGeometry(0.42, 16, 12), std(C.leaf, { roughness: 0.8 }))
      crown.position.y = 1.05
      crown.scale.set(1, 1.25, 1)
      const stem = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), std(C.trunk))
      stem.position.y = 0.6
      g.add(potM, stem, crown)
      g.position.set(mx(x), y < TERRACE[3] && x < TERRACE[2] ? 0.16 : SLAB, mz(y))
      g.userData.s = s
      scene.add(g)
      pieces.push(g)
    }

    // --- двор: деревья, изгороди, клумбы, дорожка, забор ---
    const leafMats = [std(C.leaf, { roughness: 0.85 }), std(C.leafLight, { roughness: 0.85 }), std(C.leafDark, { roughness: 0.85 })]
    const trunkMat = std(C.trunk, { roughness: 1 })
    const treeAt = (x: number, z: number, s: number, seed: number) => {
      const t = new THREE.Group()
      const tr = mesh(new THREE.CylinderGeometry(0.11, 0.17, 2.3, 7), trunkMat)
      tr.position.y = 1.15
      tr.rotation.z = (rand(seed) - 0.5) * 0.12
      t.add(tr)
      const blobs = 5 + Math.floor(rand(seed * 3) * 3)
      for (let i = 0; i < blobs; i++) {
        const r = 0.75 + rand(seed * 7 + i) * 0.6
        const b = mesh(new THREE.SphereGeometry(r, 14, 10), leafMats[Math.floor(rand(seed + i * 13) * 3)], false)
        b.position.set(
          (rand(seed * 11 + i) - 0.5) * 1.7,
          2.6 + rand(seed * 13 + i) * 1.3,
          (rand(seed * 17 + i) - 0.5) * 1.7,
        )
        b.scale.y = 0.85 + rand(seed * 19 + i) * 0.3
        t.add(b)
      }
      t.position.set(x, 0, z)
      t.userData.s = s
      scene.add(t)
      return t
    }
    const trees = (
      [
        [-9, -6.5, 1.2],
        [8.8, -7.4, 1],
        [-9.2, 7.6, 0.9],
        [9.3, 8.2, 1.1],
        [-4.5, 10.2, 0.8],
        [5.5, 10.4, 0.95],
      ] as const
    ).map(([x, z, s], i) => treeAt(x, z, s, i + 1))

    // живые изгороди вдоль боковых границ участка
    const hedges: THREE.Mesh[] = []
    for (const hx of [-10.6, 10.9]) {
      for (let z = -8.5; z < 9.5; z += 1.7) {
        const hg = mesh(new RoundedBoxGeometry(0.7, 1.05 + rand(z * hx) * 0.25, 1.75, 2, 0.18), std(C.hedge, { roughness: 0.95 }), false)
        hg.position.set(hx + (rand(z) - 0.5) * 0.15, 0.55, z)
        scene.add(hg)
        hedges.push(hg)
      }
    }

    // дорожка от крыльца к калитке — плитняк
    const porchX = mx(770)
    const pathGeo = new THREE.BoxGeometry(1.3, 0.045, 10.6 - mz(1290))
    const path = mesh(pathGeo, new THREE.MeshStandardMaterial({ map: paverTex, roughness: 1 }), false)
    path.position.set(porchX, 0.025, (mz(1290) + 10.6) / 2 + 0.05)
    scene.add(path)

    // забор со стороны улицы: кирпичные столбы + тёмная решётка, проём-калитка у дорожки
    const fence = new THREE.Group()
    const fenceZ = 10.75
    const railMat = std('#2f3133', { roughness: 0.6, metalness: 0.1 })
    const fenceMatBrick = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95 })
    const pillarXs: number[] = []
    for (let x = -10.9; x <= 10.9; x += 2.72) pillarXs.push(x)
    for (const x of pillarXs) {
      const geo = new THREE.BoxGeometry(0.38, 1.35, 0.38)
      metricBoxUV(geo, 0.38, 1.35, 0.38, 0.9)
      const p = mesh(geo, fenceMatBrick)
      p.position.set(x, 0.68, fenceZ)
      fence.add(p)
    }
    for (let i = 0; i < pillarXs.length - 1; i++) {
      const a = pillarXs[i] + 0.19
      const b = pillarXs[i + 1] - 0.19
      const mid = (a + b) / 2
      if (Math.abs(mid - porchX) < 0.9) continue // калитка
      for (const ry of [0.5, 1.15]) {
        const rail = mesh(new THREE.BoxGeometry(b - a, 0.06, 0.03), railMat, false)
        rail.position.set(mid, ry, fenceZ)
        fence.add(rail)
      }
    }
    // штакетины инстансами
    const picketXs: number[] = []
    for (let i = 0; i < pillarXs.length - 1; i++) {
      const a = pillarXs[i] + 0.25
      const b = pillarXs[i + 1] - 0.25
      const mid = (a + b) / 2
      if (Math.abs(mid - porchX) < 0.9) continue
      for (let x = a; x <= b; x += 0.16) picketXs.push(x)
    }
    const picket = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 1.0, 0.018), railMat, picketXs.length)
    const pm = new THREE.Matrix4()
    picketXs.forEach((x, i) => {
      pm.setPosition(x, 0.62, fenceZ)
      picket.setMatrixAt(i, pm)
    })
    picket.castShadow = true
    fence.add(picket)
    scene.add(fence)

    // клумбы у крыльца: грунт + тюльпаны
    const beds = new THREE.Group()
    const porchZ = mz(1290)
    for (const bx of [-1.9, 2.0]) {
      const bed = mesh(new THREE.BoxGeometry(1.1, 0.18, 0.55), soilMat, false)
      bed.position.set(porchX + bx, 0.09, porchZ + 0.75)
      beds.add(bed)
      for (let i = 0; i < 7; i++) {
        const fl = mesh(
          new THREE.SphereGeometry(0.07, 8, 6),
          std(rand(i * bx) > 0.5 ? C.flowerRed : C.flowerYellow, { roughness: 0.7 }),
          false,
        )
        fl.position.set(porchX + bx - 0.42 + i * 0.14, 0.24 + rand(i) * 0.05, porchZ + 0.68 + rand(i * 3) * 0.16)
        beds.add(fl)
      }
    }
    scene.add(beds)

    // скамейка под деревом
    const bench = new THREE.Group()
    const seat = mesh(new RoundedBoxGeometry(1.5, 0.08, 0.45, 2, 0.03), std(C.deck, { roughness: 0.85 }))
    seat.position.y = 0.48
    const back = mesh(new RoundedBoxGeometry(1.5, 0.42, 0.07, 2, 0.03), std(C.deck, { roughness: 0.85 }))
    back.position.set(0, 0.78, -0.2)
    back.rotation.x = -0.16
    bench.add(seat, back)
    for (const lx of [-0.62, 0.62]) {
      const leg = mesh(new THREE.BoxGeometry(0.08, 0.48, 0.4), railMat, false)
      leg.position.set(lx, 0.24, 0)
      bench.add(leg)
    }
    bench.position.set(-7.6, 0, -4.6)
    bench.rotation.y = 0.7
    scene.add(bench)

    const tag = document.createElement('div')
    tag.className = 'build3d__tag'
    tag.textContent = 'Здесь будет ваш дом'
    const tagObj = new CSS2DObject(tag)
    tagObj.position.set(0, 3.2, 0)
    scene.add(tagObj)

    const sand = new THREE.Color(C.sand)
    const lawnC = new THREE.Color('#8fae62')
    const slabC = new THREE.Color(C.slab)
    const oak = new THREE.Color(C.oak)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let shown = -1
    let smooth = reduce ? 1 : 0

    const apply = (p: number) => {
      const [, s1, s2, s3, s4, s5] = BUILD_STEPS
      const f = ease(phase(p, s1, s2))
      const w = ease(phase(p, s2, s3))
      const r = ease(phase(p, s3, s4))
      const o = ease(phase(p, s4, s5))
      const y = ease(phase(p, s5, 0.8))

      // the plan rides up on the slab: first a drawing on the plot, then the setting-out on the foundation
      plan.position.y = SLAB * f
      planMat.opacity = 1 - 0.85 * w
      tag.style.opacity = String(1 - ease(phase(p, 0.08, 0.22)))

      foundation.scale.y = Math.max(0.001, f)
      foundation.visible = f > 0.001

      // стены GLB: растут из эскиза, кирпич проявляется вместе с крышей; крыша чуть светлее, чтобы не уходить в чёрный
      houseWalls.visible = modelReady && w > 0.001
      houseWalls.scale.y = Math.max(0.001, w * (1 - 0.3 * y))
      for (const m of houseWallMats) m.color.copy(sketch).lerp(WHITE, r)
      for (const m of houseRoofMats) m.color.copy(sketch).lerp(ROOF_TINT, r)

      // the roof drops on, then lifts away like a dollhouse lid — и растворяется на подъёме,
      // иначе висит в кадре парящей чёрной рамкой (см. скрины: «что со стенкой»)
      houseRoof.visible = modelReady && r > 0.001 && y < 0.999
      houseRoof.position.y = ROOF_CUT + (1 - r) * 7 + ease(y) * 11
      houseRoof.scale.y = Math.max(0.001, r)
      const roofFade = 1 - ease(phase(y, 0.15, 0.85))
      for (const m of houseRoofMats) {
        m.transparent = roofFade < 0.999
        m.opacity = roofFade
        m.depthWrite = roofFade > 0.999
      }
      // тень от полупрозрачной крыши летит за участок на подложку — гасим её вместе с фейдом
      for (const c of houseRoof.children) c.castShadow = roofFade > 0.3

      houseGlass.visible = modelReady && o > 0.01
      houseGlass.scale.set(1, Math.max(0.001, w * (1 - 0.3 * y)), 1)
      for (const g of houseGlass.children) {
        const m = (g as THREE.Mesh).material as THREE.MeshStandardMaterial
        m.opacity = 0.55 * Math.min(1, o * 1.5)
      }

      floorMat.color.copy(slabC).lerp(oak, y)
      lawnMat.color.copy(sand).lerp(lawnC, y)
      deck.visible = y > 0.01
      deck.scale.set(1, Math.max(0.001, y), 1)
      path.visible = y > 0.01
      pieces.forEach((pc, i) => {
        const k = ease(clamp(y * 1.8 - (i / pieces.length) * 0.8))
        pc.visible = k > 0.001
        pc.scale.setScalar(Math.max(0.001, k * (pc.userData.s ?? 1)))
      })
      trees.forEach((t, i) => t.scale.setScalar(Math.max(0.001, ease(clamp(y * 1.6 - i * 0.12)) * t.userData.s)))
      hedges.forEach((hg, i) => {
        const k = ease(clamp(y * 1.6 - 0.15 - (i / hedges.length) * 0.5))
        hg.visible = k > 0.001
        hg.scale.setScalar(Math.max(0.001, k))
      })
      fence.visible = y > 0.25
      picket.visible = fence.visible
      beds.visible = y > 0.5
      bench.visible = y > 0.6

      // camera: a low three-quarter view while building, rising to look into the cutaway at the end
      const ang = -0.62 + p * 0.5
      const tilt = 0.5 + 0.26 * ease(phase(p, 0.55, 1))
      // a tall phone screen sees a narrow slice: step back so the whole plot fits across
      const k = Math.min(2.4, Math.max(1, 1.15 / camera.aspect))
      const dist = (47 - p * 6.5) * k
      camera.position.set(Math.sin(ang) * Math.cos(tilt) * dist, Math.sin(tilt) * dist, Math.cos(ang) * Math.cos(tilt) * dist)
      camera.lookAt(0, 1, 0.4)
    }
    const WHITE = new THREE.Color('#ffffff')
    const ROOF_TINT = new THREE.Color('#a9b0ba') // крыша: тёмный графит × этот тон = рабочий серый

    const draw = () => {
      apply(smooth)
      renderer.render(scene, camera)
      labels.render(scene, camera)
    }

    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!visible) return
      const target = reduce ? 1 : progress.current
      smooth += (target - smooth) * 0.2
      if (Math.abs(smooth - shown) < 0.0005) return
      shown = smooth
      draw()
    }
    draw()
    raf = requestAnimationFrame(loop)

    // resizing clears a WebGL canvas — redraw in the same tick so the picture never blinks empty
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      labels.setSize(w, h)
      frame(w, h)
      draw()
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      const mats = new Set<THREE.Material>()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        ;(Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => mats.add(x))
      })
      mats.forEach((m) => {
        const mm = m as THREE.MeshStandardMaterial
        mm.map?.dispose()
        m.dispose()
      })
      textures.forEach((t) => t.dispose())
      renderer.dispose()
      renderer.domElement.remove()
      labels.domElement.remove()
    }
  }, [progress])

  return <div ref={host} className="build3d__canvas" aria-hidden />
}
