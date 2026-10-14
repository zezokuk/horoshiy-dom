import * as THREE from 'three'

/**
 * One house model shared by the 3D master plan and the «we build it» scroll scene.
 * Styled after the developer's own renders: warm beige walls, brick plinth, dark-brown hip roof,
 * white-framed windows, a small porch. Parts are named so the build scene can animate them.
 */

export const PALETTE = {
  wall: '#e7dac3',
  plinth: '#8c5a44',
  roof: '#5a4136',
  frame: '#f6f1e7',
  glass: '#56707a',
  door: '#4d3a30',
  slab: '#b9b2a7',
  lawn: '#8fa676',
  paving: '#cfc6b6',
  fence: '#f1ece2',
}

// Geometry cache: 34 houses of one estate share identical parts (windows, walls, porch columns).
// Re-using one BufferGeometry instead of creating ~40 new ones per house makes the scene build several times faster
// and uses less GPU memory. three.js re-uploads a disposed geometry automatically if it is used again.
const geoCache = new Map<string, THREE.BoxGeometry>()
function box(w: number, h: number, d: number) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`
  let g = geoCache.get(key)
  if (!g) geoCache.set(key, (g = new THREE.BoxGeometry(w, h, d)))
  return g
}

const roofCache = new Map<string, THREE.BufferGeometry>()
function roofGeo(a: number, b: number, h: number) {
  const key = `${a.toFixed(3)}|${b.toFixed(3)}|${h.toFixed(3)}`
  let g = roofCache.get(key)
  if (!g) roofCache.set(key, (g = hipRoofGeometry(a, b, h)))
  return g
}

export type HouseParts = {
  group: THREE.Group
  foundation: THREE.Object3D
  walls: THREE.Object3D
  roof: THREE.Object3D
  openings: THREE.Object3D // windows + door + porch
  height: number // ridge height above ground
}

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
  return g
}

/** Cached materials so dozens of houses share a handful of GPU materials. */
export function houseMaterials(dim = false) {
  const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra })
  const tone = (c: string) => (dim ? new THREE.Color(c).lerp(new THREE.Color('#b8b2a6'), 0.22).getStyle() : c)
  return {
    wall: m(tone(PALETTE.wall)),
    plinth: m(tone(PALETTE.plinth)),
    roof: m(tone(PALETTE.roof), { roughness: 0.7, side: THREE.DoubleSide }),
    frame: m(PALETTE.frame, { roughness: 0.5 }),
    glass: m(PALETTE.glass, { roughness: 0.15, metalness: 0.4 }),
    door: m(PALETTE.door),
    slab: m(PALETTE.slab),
  }
}
export type HouseMaterials = ReturnType<typeof houseMaterials>

function windowAt(parent: THREE.Object3D, mats: HouseMaterials, w: number, h: number, x: number, y: number, z: number, rotY: number) {
  const g = new THREE.Group()
  const frame = new THREE.Mesh(box(w + 0.16, h + 0.16, 0.08), mats.frame)
  const glass = new THREE.Mesh(box(w, h, 0.1), mats.glass)
  const bar = new THREE.Mesh(box(0.06, h, 0.12), mats.frame)
  g.add(frame, glass, bar)
  g.position.set(x, y, z)
  g.rotation.y = rotY
  parent.add(g)
}

/**
 * @param a width along X (m), @param b depth along Z (m), front faces +Z.
 */
export function buildHouse(a: number, b: number, storeys: 1 | 2, mats: HouseMaterials, attic = false): HouseParts {
  const group = new THREE.Group()
  // attic (mansard) floor: a knee wall over the ground floor, a steeper roof and a dormer window on the front slope
  const wallH = storeys === 2 ? 5.8 : attic ? 3.9 : 3.0
  const base = 0.4

  const foundation = new THREE.Mesh(box(a + 0.5, base, b + 0.5), mats.slab)
  foundation.position.y = base / 2
  foundation.name = 'foundation'

  const walls = new THREE.Group()
  walls.name = 'walls'
  const body = new THREE.Mesh(box(a, wallH, b), mats.wall)
  body.position.y = base + wallH / 2
  const plinth = new THREE.Mesh(box(a + 0.08, 0.55, b + 0.08), mats.plinth)
  plinth.position.y = base + 0.275
  walls.add(body, plinth)
  if (storeys === 2) {
    const band = new THREE.Mesh(box(a + 0.1, 0.18, b + 0.1), mats.frame)
    band.position.y = base + wallH / 2
    walls.add(band)
  }

  const roofH = Math.min(a, b) * (attic ? 0.6 : 0.36) // 0.36 also matches blueprintPoints of the build scene
  const roof = new THREE.Group()
  roof.name = 'roof'
  const roofMesh = new THREE.Mesh(roofGeo(a + 0.9, b + 0.9, roofH), mats.roof)
  roofMesh.position.y = base + wallH
  const eave = new THREE.Mesh(box(a + 0.95, 0.12, b + 0.95), mats.frame)
  eave.position.y = base + wallH + 0.02
  roof.add(eave, roofMesh)
  if (attic) {
    const dw = Math.min(2.4, a * 0.3)
    const dh = Math.min(1.6, roofH * 0.45)
    const dd = 1.8
    // on both slopes: the 3D plan is turned around, so a house is often seen from the back
    for (const side of [1, -1]) {
      const z = side * (b / 2 - dd / 2 + 0.3)
      const dormer = new THREE.Mesh(box(dw, dh, dd), mats.wall)
      dormer.position.set(0, base + wallH + dh / 2, z)
      const cap = new THREE.Mesh(roofGeo(dw + 0.4, dd + 0.4, 0.7), mats.roof)
      cap.position.set(0, base + wallH + dh, z)
      roof.add(dormer, cap)
      windowAt(roof, mats, dw * 0.5, dh * 0.6, 0, base + wallH + dh / 2, z + side * (dd / 2 + 0.02), side === 1 ? 0 : Math.PI)
    }
  }

  const openings = new THREE.Group()
  openings.name = 'openings'
  const floors = storeys === 2 ? [base + 1.6, base + 1.6 + wallH / 2] : [base + 1.6]
  const winW = Math.min(1.5, a * 0.14)
  for (const y of floors) {
    for (const fx of [-0.32, 0.32]) windowAt(openings, mats, winW, 1.3, fx * a, y, b / 2 + 0.02, 0)
    for (const fx of [-0.3, 0, 0.3]) windowAt(openings, mats, winW, 1.3, fx * a, y, -b / 2 - 0.02, Math.PI)
    for (const fz of [-0.22, 0.22]) {
      windowAt(openings, mats, winW, 1.3, a / 2 + 0.02, y, fz * b, Math.PI / 2)
      windowAt(openings, mats, winW, 1.3, -a / 2 - 0.02, y, fz * b, -Math.PI / 2)
    }
  }
  const door = new THREE.Mesh(box(1.0, 2.1, 0.1), mats.door)
  door.position.set(0, base + 1.05, b / 2 + 0.03)
  openings.add(door)
  // porch: slab + two white columns
  const porch = new THREE.Mesh(box(2.6, 0.2, 1.4), mats.slab)
  porch.position.set(0, base - 0.1, b / 2 + 0.7)
  openings.add(porch)
  for (const px of [-1.1, 1.1]) {
    const col = new THREE.Mesh(box(0.22, wallH - 0.2, 0.22), mats.frame)
    col.position.set(px, base + (wallH - 0.2) / 2, b / 2 + 1.25)
    openings.add(col)
  }

  for (const o of [foundation, walls, roof, openings]) {
    o.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true
        c.receiveShadow = true
      }
    })
    group.add(o)
  }

  return { group, foundation, walls, roof, openings, height: base + wallH + roofH }
}

/** Points along the house edges — the «blueprint» state of the build scene (a nod to the dot-house). */
export function blueprintPoints(a: number, b: number, storeys: 1 | 2, step = 0.35) {
  const wallH = storeys === 2 ? 5.8 : 3.0
  const base = 0.4
  const roofH = Math.min(a, b) * 0.36
  const pts: number[] = []
  const seg = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1, z2 - z1) / step))
    for (let i = 0; i <= n; i++) pts.push(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, z1 + ((z2 - z1) * i) / n)
  }
  const A = a / 2
  const B = b / 2
  for (const y of [base, base + wallH]) {
    seg(-A, y, -B, A, y, -B)
    seg(A, y, -B, A, y, B)
    seg(A, y, B, -A, y, B)
    seg(-A, y, B, -A, y, -B)
  }
  for (const [x, z] of [
    [-A, -B],
    [A, -B],
    [A, B],
    [-A, B],
  ])
    seg(x, base, z, x, base + wallH, z)
  const top = base + wallH
  const long = a >= b
  const r = Math.max(0, (long ? a : b) / 2 - (long ? b : a) / 2)
  const r1: [number, number, number] = long ? [-r, top + roofH, 0] : [0, top + roofH, -r]
  const r2: [number, number, number] = long ? [r, top + roofH, 0] : [0, top + roofH, r]
  seg(...r1, ...r2)
  seg(-A, top, -B, ...r1)
  seg(-A, top, B, ...(long ? r1 : r2))
  seg(A, top, -B, ...(long ? r2 : r1))
  seg(A, top, B, ...r2)
  return new Float32Array(pts)
}
