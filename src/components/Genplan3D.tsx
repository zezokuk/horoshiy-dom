'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { HINT, bindTouch, bindWheel, useHint } from '@/lib/gestures'
import { EDGE, PAD, STREET, W, footprint, type Layout, type Plot } from '@/lib/genplan'
import {
  DIM_TINT,
  PALETTE,
  brickTexture,
  buildHouseGeoms,
  houseKindFor,
  lawnTexture,
  metricBoxUV,
  paverTexture,
  roofTexture,
  type MatKey,
} from '@/lib/house3d'

const S = 0.1 // 1000 layout units → 100 m of scene
const SKY = '#eef1e8' // светлый фон под бело-зелёный сайт

type Props = {
  layout: Layout
  activeN: number | null
  onSelect: (n: number, pointer: string, x: number, y: number) => void
  onHover: (n: number | null, x?: number, y?: number) => void
  onFail: () => void
  /** Filled by the scene: flies the camera to a house, resolves when it arrives. */
  flyRef?: { current: ((n: number) => Promise<void>) | null }
  /** Plots that pass the visitor's filter (GenplanFilters); the others go grey. null — no filter. */
  match?: number[] | null
}

function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const MAT_KEYS: MatKey[] = ['wall', 'plinth', 'roof', 'frame', 'glass', 'door', 'slab', 'trim']

export default function Genplan3D({ layout, activeN, onSelect, onHover, onFail, flyRef, match = null }: Props) {
  const box = useRef<HTMLDivElement>(null) // canvas host, never gets React children
  const api = useRef<{
    highlight: (n: number | null) => void
    filter: (m: number[] | null) => void
    zoom: (k: number) => void
    rotate: (a: number) => void
    reset: () => void
  } | null>(null)
  const matchRef = useRef(match) // the filter to apply when the scene is (re)built
  // latest callbacks for the scene's event handlers, which are created once per layout
  const select = useRef(onSelect)
  const hover = useRef(onHover)
  const [hintState, showHint] = useHint()
  const hintRef = useRef(showHint)
  useLayoutEffect(() => {
    select.current = onSelect
    hover.current = onHover
    hintRef.current = showHint
  })
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  useEffect(() => {
    const el = box.current
    if (!el) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      onFail()
      return
    }
    const small = el.clientWidth < 700
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.shadowMap.enabled = !small
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    el.appendChild(renderer.domElement)

    const labels = new CSS2DRenderer()
    labels.setSize(el.clientWidth, el.clientHeight)
    labels.domElement.className = 'g3__labels'
    el.appendChild(labels.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(SKY)
    scene.fog = new THREE.Fog(SKY, 170, 460)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.45
    pmrem.dispose()

    const cx = W / 2
    const cz = layout.height / 2
    const X = (x: number) => (x - cx) * S
    const Z = (y: number) => (y - cz) * S
    const span = Math.max(W, layout.height) * S

    scene.add(new THREE.HemisphereLight('#f4f8ff', '#a8a28c', 1.15))
    const sun = new THREE.DirectionalLight('#ffedd0', 2.2)
    sun.position.set(span * 0.5, span * 0.9, span * 0.35)
    sun.castShadow = !small
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: span * 3 })
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.02
    scene.add(sun)

    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    const texBrick = brickTexture()
    const texRoof = roofTexture()
    const texLawn = lawnTexture()
    const texPaver = paverTexture()
    for (const t of [texBrick, texRoof, texLawn, texPaver]) t.anisotropy = aniso

    const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra })
    // материалы «живых» домов и приглушённых (нет в продаже) — одна палитра, два оттенка
    const dim = (c: string) => new THREE.Color(c).lerp(new THREE.Color(DIM_TINT), 0.28).getStyle()
    const liveMats: Record<MatKey, THREE.MeshStandardMaterial> = {
      wall: std('#ffffff', { map: texBrick }),
      plinth: std(PALETTE.plinth),
      roof: std('#ffffff', { map: texRoof, roughness: 0.65, side: THREE.DoubleSide }),
      frame: std(PALETTE.frame, { roughness: 0.5 }),
      glass: std(PALETTE.glass, { roughness: 0.12, metalness: 0.5 }),
      door: std(PALETTE.door),
      slab: std(PALETTE.slab),
      trim: std(PALETTE.trim, { roughness: 0.6 }),
    }
    const dimMats: Record<MatKey, THREE.MeshStandardMaterial> = {
      ...liveMats,
      wall: std(dim('#cfc4bb'), { map: texBrick }),
      roof: std(dim('#8b8d92'), { map: texRoof, roughness: 0.7, side: THREE.DoubleSide }),
      trim: std(dim(PALETTE.trim)),
      frame: std(dim(PALETTE.frame)),
    }

    // ---------- статика: merge по материалам, дома = геометрии из house3d ----------
    const binsLive: Record<MatKey, THREE.BufferGeometry[]> = { wall: [], plinth: [], roof: [], frame: [], glass: [], door: [], slab: [], trim: [] }
    const binsDim: Record<MatKey, THREE.BufferGeometry[]> = { wall: [], plinth: [], roof: [], frame: [], glass: [], door: [], slab: [], trim: [] }
    const housesAt = new Map<number, { pos: THREE.Vector3; front: number; h: number }>()
    const statusAt = new Map<number, Plot['status']>()
    const priceTags = new Map<number, HTMLDivElement>()
    const pickables: THREE.Object3D[] = []
    const add = (m: THREE.Object3D) => (scene.add(m), m)
    const m4 = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const eu = new THREE.Euler()
    const one = new THREE.Vector3(1, 1, 1)

    layout.plots.forEach((p: Plot) => {
      const { hx, hy, hw, hh } = footprint(p)
      const a = hw * S
      const b = hh * S
      const hxC = X(hx + hw / 2)
      const hzC = Z(hy + hh / 2)
      const storeys = p.unit?.storeys ?? ((p.unit?.area ?? 0) >= 140 ? 2 : 1)
      const attic = storeys === 1 && !!p.unit?.mansard
      const kind = houseKindFor(p.unit?.title, storeys, attic)
      const h = buildHouseGeoms(a, b, storeys, attic, kind, p.unit?.title ?? String(p.n))
      // в мировые координаты участка: поворот фасадом к улице + посадка на газон
      eu.set(0, p.flip ? 0 : Math.PI, 0)
      q.setFromEuler(eu)
      m4.compose(new THREE.Vector3(hxC, 0.48, hzC), q, one)
      const bins = p.status === 'na' ? binsDim : binsLive
      for (const key of MAT_KEYS) {
        for (const g of h.byMat.get(key) ?? []) {
          g.applyMatrix4(m4)
          bins[key].push(g)
        }
      }
      housesAt.set(p.n, { pos: new THREE.Vector3(hxC, 0, hzC), front: p.flip ? 1 : -1, h: h.height })
      statusAt.set(p.n, p.status)

      // невидимый pick-бокс участка (не рендерится, но ловит raycast)
      const pick = new THREE.Mesh(new THREE.BoxGeometry(p.w * S, 3, p.h * S))
      pick.position.set(X(p.x + p.w / 2), 1.5, Z(p.y + p.h / 2))
      pick.visible = false
      pick.userData.n = p.n
      scene.add(pick)
      pickables.push(pick)
    })

    const merged: THREE.BufferGeometry[] = []
    const mergeInto = (bins: Record<MatKey, THREE.BufferGeometry[]>, mats: Record<MatKey, THREE.MeshStandardMaterial>) => {
      for (const key of MAT_KEYS) {
        if (!bins[key].length) continue
        const g = mergeGeometries(bins[key], false)
        if (!g) continue
        merged.push(g)
        const m = new THREE.Mesh(g, mats[key])
        m.castShadow = !small
        m.receiveShadow = true
        add(m)
      }
    }
    mergeInto(binsLive, liveMats)
    mergeInto(binsDim, dimMats)

    // ---------- участки: газоны и бордюры-статусы — инстансы с instanceColor ----------
    const N = layout.plots.length
    const lawnMat = std('#ffffff', { map: texLawn })
    const lawns = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.28, 1), lawnMat, N)
    const curbMat = std('#ffffff', { roughness: 0.6 })
    const curbs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.42, 0.25), curbMat, N * 4)
    const lawnBase: THREE.Color[] = []
    layout.plots.forEach((p, i) => {
      const cw = p.w * S
      const ch = p.h * S
      const ccx = X(p.x + p.w / 2)
      const ccz = Z(p.y + p.h / 2)
      m4.compose(new THREE.Vector3(ccx, 0.34, ccz), new THREE.Quaternion(), new THREE.Vector3(cw, 1, ch))
      lawns.setMatrixAt(i, m4)
      const base = new THREE.Color(PALETTE.lawn).offsetHSL(0, 0, (rand(p.n * 3.7) - 0.5) * 0.06)
      lawnBase.push(base)
      lawns.setColorAt(i, base)
      const edge = new THREE.Color(EDGE[p.status])
      const sides: [number, number, number][] = [
        [cw, 0, -ch / 2],
        [cw, 0, ch / 2],
        [ch, -cw / 2, 0],
        [ch, cw / 2, 0],
      ]
      sides.forEach(([len, ox, oz], k) => {
        const vertical = ox !== 0
        m4.compose(
          new THREE.Vector3(ccx + ox, 0.42, ccz + oz),
          new THREE.Quaternion(),
          new THREE.Vector3(vertical ? 1 : len, 1, vertical ? len : 1),
        )
        curbs.setMatrixAt(i * 4 + k, m4)
        curbs.setColorAt(i * 4 + k, edge)
      })
    })
    lawns.receiveShadow = true
    add(lawns)
    add(curbs)

    // кольца подсветки hover / active (динамические — не фризим)
    const ringGeo = new THREE.PlaneGeometry(1, 1)
    const mkRing = (color: string) => {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false }))
      m.rotation.x = -Math.PI / 2
      m.visible = false
      return m
    }
    const ringHover = mkRing('#c9a86a')
    const ringActive = mkRing('#4f8a5b')
    ringHover.position.y = 0.62
    ringActive.position.y = 0.6
    add(ringHover)
    add(ringActive)
    const ringAt = (ring: THREE.Mesh, p: Plot) => {
      ring.position.x = X(p.x + p.w / 2)
      ring.position.z = Z(p.y + p.h / 2)
      ring.scale.set(p.w * S + 0.7, p.h * S + 0.7, 1)
    }

    // ---------- улицы: асфальт, разметка, тротуары, фонари, забор со столбами ----------
    const asphalt = std('#6f6b66', { roughness: 0.95 })
    const paint = std('#f3efe6')
    const roadGeoms: THREE.BufferGeometry[] = []
    const paintGeoms: THREE.BufferGeometry[] = []
    const walkGeoms: THREE.BufferGeometry[] = []
    const lampPosts: THREE.Vector3[] = []
    const fencePosts: THREE.Vector3[] = []
    const fenceRails: THREE.BufferGeometry[] = []
    for (const s of layout.streets) {
      const len = (W - PAD * 2 + 20) * S
      const wid = (STREET - 16) * S
      const zc = Z(s.y + STREET / 2)
      const road = new THREE.BoxGeometry(len, 0.12, wid)
      road.translate(0, 0.26, zc)
      roadGeoms.push(road)
      for (const dz of [-wid / 2 + 0.25, wid / 2 - 0.25]) {
        const line = new THREE.BoxGeometry(len - 1, 0.02, 0.12)
        line.translate(0, 0.33, zc + dz)
        paintGeoms.push(line)
      }
      for (let x = -len / 2 + 2; x < len / 2 - 2; x += 3.2) {
        const d = new THREE.BoxGeometry(1.5, 0.02, 0.14)
        d.translate(x + 0.75, 0.33, zc)
        paintGeoms.push(d)
      }
      // тротуары с обеих сторон
      for (const dz of [-wid / 2 - 0.45, wid / 2 + 0.45]) {
        const walk = new THREE.BoxGeometry(len, 0.1, 0.9)
        walk.translate(0, 0.3, zc + dz)
        walkGeoms.push(walk)
      }
      // фонари и заборные столбы вдоль улицы
      for (let x = -len / 2 + 5; x < len / 2 - 4; x += 9.5) {
        lampPosts.push(new THREE.Vector3(x, 0.35, zc - wid / 2 - 0.5))
        lampPosts.push(new THREE.Vector3(x + 4.75, 0.35, zc + wid / 2 + 0.5))
      }
      for (let x = -len / 2 + 3; x < len / 2 - 2; x += 6) {
        fencePosts.push(new THREE.Vector3(x, 0.35, zc - wid / 2 - 0.95))
        fencePosts.push(new THREE.Vector3(x, 0.35, zc + wid / 2 + 0.95))
        const rail = new THREE.BoxGeometry(6, 0.9, 0.06)
        rail.translate(x + 3, 0.35 + 0.9, zc - wid / 2 - 0.95)
        fenceRails.push(rail)
        const rail2 = new THREE.BoxGeometry(6, 0.9, 0.06)
        rail2.translate(x + 3, 0.35 + 0.9, zc + wid / 2 + 0.95)
        fenceRails.push(rail2)
      }
    }
    const roadMesh = new THREE.Mesh(mergeGeometries(roadGeoms, false)!, asphalt)
    roadMesh.receiveShadow = true
    add(roadMesh)
    add(new THREE.Mesh(mergeGeometries(paintGeoms, false)!, paint))
    const walkMat = std('#ffffff', { map: texPaver })
    const walkMesh = new THREE.Mesh(mergeGeometries(walkGeoms, false)!, walkMat)
    walkMesh.receiveShadow = true
    add(walkMesh)

    // фонари: столб + голова, инстансы
    const lampPostGeo = new THREE.CylinderGeometry(0.07, 0.09, 3.2, 6)
    const lampHeadGeo = new THREE.BoxGeometry(0.5, 0.12, 0.22)
    const lampPost = new THREE.InstancedMesh(lampPostGeo, std('#3a3d40'), lampPosts.length)
    const lampHead = new THREE.InstancedMesh(lampHeadGeo, std('#3a3d40'), lampPosts.length)
    lampPosts.forEach((pos, i) => {
      m4.compose(new THREE.Vector3(pos.x, pos.y + 1.6, pos.z), new THREE.Quaternion(), one)
      lampPost.setMatrixAt(i, m4)
      m4.compose(new THREE.Vector3(pos.x, pos.y + 3.25, pos.z), new THREE.Quaternion(), one)
      lampHead.setMatrixAt(i, m4)
    })
    lampPost.castShadow = !small
    add(lampPost)
    add(lampHead)

    // забор со стороны улиц: кирпичные столбы + тёмные прутья
    const postGeo = new THREE.BoxGeometry(0.34, 1.5, 0.34)
    const postMat = std('#ffffff', { map: texBrick })
    const posts = new THREE.InstancedMesh(postGeo, postMat, fencePosts.length)
    fencePosts.forEach((pos, i) => {
      m4.compose(new THREE.Vector3(pos.x, pos.y + 0.75, pos.z), new THREE.Quaternion(), one)
      posts.setMatrixAt(i, m4)
    })
    posts.castShadow = !small
    add(posts)
    add(new THREE.Mesh(mergeGeometries(fenceRails, false)!, std('#2c2e31', { roughness: 0.5, metalness: 0.3 })))

    // ---------- коммерческие здания ----------
    const stone = std('#8f8476')
    const glassC = std('#7f97a0', { roughness: 0.15, metalness: 0.35 })
    const flat = std('#d8d3c9')
    for (const c of layout.comm) {
      const w = c.w * S * 0.9
      const d = c.h * S * 0.78
      const x = X(c.x + c.w / 2)
      const z = Z(c.y + c.h / 2)
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), stone)
      b1.position.set(x, 1.3, z)
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), glassC)
      b2.position.set(x, 3.7, z)
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.35, d + 0.4), flat)
      top.position.set(x, 5.2, z)
      for (const m of [b1, b2, top]) {
        m.castShadow = m.receiveShadow = !small
        add(m)
      }
    }

    // ---------- дворы: подъезды, живые изгороди, кусты, машины, парковочные контуры ----------
    const dwGeoms: THREE.BufferGeometry[] = []
    const hedgeGeoms: THREE.BufferGeometry[] = []
    const parkingGeoms: THREE.BufferGeometry[] = []
    const carBodySpots: { pos: THREE.Vector3; rot: number; k: number }[] = []
    layout.plots.forEach((p) => {
      const cw = p.w * S
      const ch = p.h * S
      const { hx, hy, hw, hh } = footprint(p)
      const a = hw * S
      const b = hh * S
      const hxC = X(hx + hw / 2)
      const hzC = Z(hy + hh / 2)
      const streetZ = p.flip ? Z(p.y + p.h) - 0.4 : Z(p.y) + 0.4
      const backWall = p.flip ? hzC - b / 2 : hzC + b / 2
      const side = (cw - a) / 2
      const dwW = Math.max(1.6, Math.min(2.8, side - 0.4))
      const dw = new THREE.BoxGeometry(dwW, 0.06, Math.abs(streetZ - backWall))
      dw.translate(hxC + a / 2 + side / 2, 0.5, (streetZ + backWall) / 2)
      dwGeoms.push(dw)
      const backZ = p.flip ? Z(p.y) + 0.6 : Z(p.y + p.h) - 0.6
      const hg = new THREE.BoxGeometry(cw - 1.2, 0.9, 0.6)
      hg.translate(X(p.x + p.w / 2), 0.9, backZ)
      hedgeGeoms.push(hg)
      // низкая изгородь по левой границе участка: одна на соседскую пару, а не двойная
      const hs = new THREE.BoxGeometry(0.5, 0.7, ch - 1.4)
      hs.translate(X(p.x) + 0.32, 0.85, Z(p.y + p.h / 2))
      hedgeGeoms.push(hs)
      // парковочный контур на свободном участке — «место под машину», как в референсе посёлка
      if (p.status === 'free' && side > 1.2) {
        const px = hxC - a / 2 - side / 2
        const pz = p.flip ? Z(p.y + p.h) - 1.7 : Z(p.y) + 1.7
        const pw = 4.8
        const pd = 2.3
        const t = 0.14
        for (const [bx, bz, bw, bd] of [
          [0, -pd / 2, pw, t],
          [0, pd / 2, pw, t],
          [-pw / 2, 0, t, pd],
          [pw / 2, 0, t, pd],
        ] as const) {
          const bar = new THREE.BoxGeometry(bw, 0.025, bd)
          bar.translate(px + bx, 0.5, pz + bz)
          parkingGeoms.push(bar)
        }
      }
      if (p.status !== 'free' && rand(p.n + 11) < (p.status === 'sold' ? 0.85 : 0.5)) {
        carBodySpots.push({ pos: new THREE.Vector3(hxC + a / 2 + side / 2, 0.48, streetZ + (p.flip ? -3 : 3)), rot: 0, k: Math.min(1, dwW / 2.1) })
      }
    })
    const dwMesh = new THREE.Mesh(mergeGeometries(dwGeoms, false)!, std(PALETTE.paving))
    dwMesh.receiveShadow = true
    add(dwMesh)
    const hedgeMesh = new THREE.Mesh(mergeGeometries(hedgeGeoms, false)!, std('#617c52'))
    hedgeMesh.castShadow = !small
    add(hedgeMesh)
    if (parkingGeoms.length) add(new THREE.Mesh(mergeGeometries(parkingGeoms, false)!, paint))

    // ---------- въездные ворота с вывеской «ХОРОШИЙ ДОМ» ----------
    const gateStreet = layout.streets[0]
    if (gateStreet) {
      const zc = Z(gateStreet.y + STREET / 2)
      const gx = -((W - PAD * 2 + 20) * S) / 2 + 7
      const roadW = (STREET - 16) * S
      const colGeoms: THREE.BufferGeometry[] = []
      const trimGeoms: THREE.BufferGeometry[] = []
      for (const sz of [-1, 1]) {
        const col = metricBoxUV(new THREE.BoxGeometry(0.52, 2.7, 0.52) as unknown as THREE.BoxGeometry)
        col.translate(gx, 0.3 + 1.35, zc + sz * (roadW / 2 + 0.62))
        colGeoms.push(col)
        const cap = new THREE.BoxGeometry(0.74, 0.14, 0.74)
        cap.translate(gx, 3.07, zc + sz * (roadW / 2 + 0.62))
        trimGeoms.push(cap)
      }
      const beam = new THREE.BoxGeometry(0.26, 0.5, roadW + 2.24)
      beam.translate(gx, 3.25, zc)
      trimGeoms.push(beam)
      const gateCols = new THREE.Mesh(mergeGeometries(colGeoms, false)!, std('#ffffff', { map: texBrick }))
      gateCols.castShadow = !small
      add(gateCols)
      add(new THREE.Mesh(mergeGeometries(trimGeoms, false)!, std(PALETTE.trim, { roughness: 0.6 })))
      // табличка с названием: видна с въезда (с западного торца)
      const cv = document.createElement('canvas')
      cv.width = 1024
      cv.height = 160
      const g2 = cv.getContext('2d')!
      g2.fillStyle = '#2c2e31'
      g2.fillRect(0, 0, 1024, 160)
      g2.strokeStyle = '#c9a86a'
      g2.lineWidth = 6
      g2.strokeRect(12, 12, 1000, 136)
      g2.fillStyle = '#f1ece2'
      g2.font = '700 92px Georgia, "Times New Roman", serif'
      g2.textAlign = 'center'
      g2.textBaseline = 'middle'
      g2.fillText('ХОРОШИЙ ДОМ', 512, 84)
      const signTex = new THREE.CanvasTexture(cv)
      signTex.colorSpace = THREE.SRGBColorSpace
      signTex.anisotropy = aniso
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(4.6, 0.72),
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, side: THREE.DoubleSide }),
      )
      sign.rotation.y = -Math.PI / 2
      sign.position.set(gx - 0.14, 3.25, zc)
      add(sign)
    }

    // машины: кузова с instanceColor + стёкла
    const carBodyGeo = new THREE.BoxGeometry(1.8, 0.7, 4.2)
    const carCabGeo = new THREE.BoxGeometry(1.6, 0.6, 2.2)
    const carMat = std('#ffffff', { roughness: 0.35, metalness: 0.4 })
    const carGlass = std('#2a3236', { roughness: 0.1, metalness: 0.5 })
    const carBodies = new THREE.InstancedMesh(carBodyGeo, carMat, carBodySpots.length)
    const carCabs = new THREE.InstancedMesh(carCabGeo, carGlass, carBodySpots.length)
    const carColors = ['#e9e6df', '#3a3f44', '#7d1f22', '#2f4b6e', '#b8bcc0'].map((c) => new THREE.Color(c))
    carBodySpots.forEach((s, i) => {
      m4.compose(new THREE.Vector3(s.pos.x, s.pos.y + 0.65 * s.k, s.pos.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.rot, 0)), new THREE.Vector3(s.k, s.k, s.k))
      carBodies.setMatrixAt(i, m4)
      carBodies.setColorAt(i, carColors[Math.floor(rand(i * 13.7) * carColors.length)])
      m4.compose(new THREE.Vector3(s.pos.x, s.pos.y + 1.25 * s.k, s.pos.z - 0.2 * s.k), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.rot, 0)), new THREE.Vector3(s.k, s.k, s.k))
      carCabs.setMatrixAt(i, m4)
    })
    carBodies.castShadow = !small
    add(carBodies)
    add(carCabs)

    // ---------- деревья: 3 породы, инстансы, оттенки через instanceColor ----------
    const yardSpots: [number, number, number][] = [] // x, z, scale
    layout.plots.forEach((p, i) => {
      if (rand(i + 7) < 0.45) {
        const yard = p.flip ? p.y + 20 : p.y + p.h - 20
        yardSpots.push([X(p.x + 12 + rand(i) * 20), Z(yard), 0.5 + rand(i + 3) * 0.25])
      }
    })
    const aroundSpots: [number, number, number, number][] = [] // x, z, scale, вид (0 round, 1 thuja, 2 poplar)
    const wS = W * S
    const hS = layout.height * S
    for (let t = 0; t < 90; t++) {
      const side = t % 4
      const k = rand(t + 1)
      const off = 4 + rand(t + 50) * 14
      const x = side < 2 ? -wS / 2 + k * wS : side === 2 ? -wS / 2 - off : wS / 2 + off
      const z = side === 0 ? -hS / 2 - off : side === 1 ? hS / 2 + off : -hS / 2 + k * hS
      aroundSpots.push([x, z, 0.8 + rand(t + 99) * 0.6, Math.floor(rand(t + 31) * 3)])
    }
    // ряды тополей вдоль улиц во дворах
    layout.streets.forEach((s, si) => {
      for (let x = -wS / 2 + 8; x < wS / 2 - 6; x += 14) {
        if (rand(x * 0.7 + si) < 0.5) continue
        aroundSpots.push([x, Z(s.y) - 2.2, 0.7 + rand(x + si) * 0.2, 2])
        aroundSpots.push([x + 7, Z(s.y + STREET) + 2.2, 0.7 + rand(x + si + 5) * 0.2, 2])
      }
    })

    const mkTrees = (
      spots: { x: number; z: number; s: number }[],
      crownGeo: THREE.BufferGeometry,
      trunkGeo: THREE.BufferGeometry,
      crownY: (s: number) => number,
      trunkY: (s: number) => number,
      crownScale: (s: number) => THREE.Vector3,
      greens: string[],
      flat = true,
    ) => {
      const crownMat = std('#ffffff', { flatShading: flat })
      const crowns = new THREE.InstancedMesh(crownGeo, crownMat, spots.length)
      const trunks = new THREE.InstancedMesh(trunkGeo, std('#6b5444'), spots.length)
      spots.forEach((sp, i) => {
        m4.compose(new THREE.Vector3(sp.x, crownY(sp.s), sp.z), new THREE.Quaternion(), crownScale(sp.s))
        crowns.setMatrixAt(i, m4)
        crowns.setColorAt(i, new THREE.Color(greens[Math.floor(rand(sp.x * 3.1 + sp.z) * greens.length)]))
        m4.compose(new THREE.Vector3(sp.x, trunkY(sp.s), sp.z), new THREE.Quaternion(), new THREE.Vector3(sp.s, sp.s, sp.s))
        trunks.setMatrixAt(i, m4)
      })
      crowns.castShadow = !small
      trunks.castShadow = !small
      add(crowns)
      add(trunks)
    }
    const rounds = [...yardSpots.filter((_, i) => i % 3 !== 2).map(([x, z, s]) => ({ x, z, s })), ...aroundSpots.filter((t) => t[3] === 0).map(([x, z, s]) => ({ x, z, s }))]
    const thujas = [...yardSpots.filter((_, i) => i % 3 === 2).map(([x, z, s]) => ({ x, z, s: s * 0.8 })), ...aroundSpots.filter((t) => t[3] === 1).map(([x, z, s]) => ({ x, z, s }))]
    const poplars = aroundSpots.filter((t) => t[3] === 2).map(([x, z, s]) => ({ x, z, s }))
    mkTrees(rounds, new THREE.IcosahedronGeometry(1.6, 0), new THREE.CylinderGeometry(0.15, 0.2, 1.6, 6), (s) => 2.8 * s, (s) => 0.8 * s, (s) => new THREE.Vector3(s, s * 1.15, s), ['#5c7a4f', '#6f8450', '#4f6a44'])
    mkTrees(thujas, new THREE.ConeGeometry(0.75, 3.2, 7), new THREE.CylinderGeometry(0.1, 0.12, 0.5, 5), (s) => 2.0 * s, () => 0.25, (s) => new THREE.Vector3(s, s, s), ['#3f5c3c', '#4a6b44', '#54764a'])
    mkTrees(poplars, new THREE.CylinderGeometry(0.55, 0.8, 4.6, 7), new THREE.CylinderGeometry(0.12, 0.16, 1.6, 5), (s) => 3.6 * s, (s) => 0.8 * s, (s) => new THREE.Vector3(s, s, s), ['#4c6b42', '#57774a'], false)

    // кусты вдоль фасадов и тротуаров
    const bushSpots: { x: number; z: number; s: number }[] = []
    layout.plots.forEach((p, i) => {
      if (rand(i + 23) < 0.6) {
        const front = p.flip ? Z(p.y + p.h) - 1.6 : Z(p.y) + 1.6
        bushSpots.push({ x: X(p.x + 4 + rand(i) * (p.w - 8)), z: front, s: 0.5 + rand(i + 4) * 0.35 })
      }
    })
    const bushMat = std('#ffffff', { flatShading: true })
    const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.6, 0), bushMat, bushSpots.length)
    bushSpots.forEach((sp, i) => {
      m4.compose(new THREE.Vector3(sp.x, 0.55 * sp.s + 0.35, sp.z), new THREE.Quaternion(), new THREE.Vector3(sp.s * 1.4, sp.s, sp.s * 1.4))
      bushes.setMatrixAt(i, m4)
      bushes.setColorAt(i, new THREE.Color(['#5a7548', '#6c8a52', '#4c6840'][Math.floor(rand(i * 7.3) * 3)]))
    })
    bushes.castShadow = !small
    add(bushes)

    // ---------- подложка и Кубань вокруг: поля, лесополосы, дымка ----------
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), std('#cfd8b8'))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    add(ground)
    const base = new THREE.Mesh(new THREE.BoxGeometry(wS + 4, 0.2, hS + 4), std('#e7e2d4'))
    base.position.y = 0.1
    base.receiveShadow = true
    add(base)

    const fieldCols = ['#d9c07a', '#b08d5e', '#9ab86a', '#c9a35e', '#8fae62', '#cbbb84']
    for (let i = 0; i < 6; i++) {
      const fw = 60 + rand(i * 3.3) * 70
      const fh = 45 + rand(i * 7.1) * 55
      const ang = (i / 6) * Math.PI * 2 + rand(i) * 0.5
      const dist = Math.max(wS, hS) * 0.75 + 30 + rand(i * 11) * 40
      const field = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), std(fieldCols[i], { roughness: 1 }))
      field.rotation.x = -Math.PI / 2
      field.rotation.z = ang
      field.position.set(Math.cos(ang) * dist, 0.02 + i * 0.004, Math.sin(ang) * dist)
      add(field)
    }

    // статика заморожена: матрицы не пересчитываются каждый кадр
    scene.traverse((o) => {
      o.updateMatrix()
      o.matrixAutoUpdate = false
    })
    ringHover.matrixAutoUpdate = true
    ringActive.matrixAutoUpdate = true

    // ценники свободных домов
    layout.plots.forEach((p) => {
      if (p.unit && p.status === 'free') {
        const div = document.createElement('div')
        div.className = 'g3-label'
        div.textContent = `${(p.unit.price / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн`
        priceTags.set(p.n, div)
        const h = housesAt.get(p.n)
        const label = new CSS2DObject(div)
        label.position.set(h?.pos.x ?? 0, 0.48 + (h?.h ?? 4) + 1.8, h?.pos.z ?? 0)
        add(label)
      }
    })

    // camera + controls with a short fly-in
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.5, 1500)
    const target = new THREE.Vector3(0, 0, 0)
    const end = new THREE.Vector3(span * 0.22, span * (small ? 0.78 : 0.44), span * (small ? 0.78 : 0.52))
    const start = end.clone().multiplyScalar(1.9).add(new THREE.Vector3(-span * 0.8, span * 0.4, 0))
    camera.position.copy(reduce ? end : start)
    camera.lookAt(target)

    const controls = new MapControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.screenSpacePanning = false
    controls.enableZoom = false
    controls.maxPolarAngle = 1.22
    controls.minDistance = span * 0.12
    controls.maxDistance = span * 1.8
    controls.target.copy(target)
    controls.autoRotate = !reduce
    controls.autoRotateSpeed = 0.45
    controls.enabled = false
    controls.touches = { TWO: THREE.TOUCH.DOLLY_PAN }
    renderer.domElement.style.touchAction = 'pan-y'
    let flyT = reduce ? 1 : 0
    controls.addEventListener('start', () => (controls.autoRotate = false))
    const limX = (W * S) / 2
    const limZ = (layout.height * S) / 2
    const clampTarget = () => {
      const t = controls.target
      const cx2 = THREE.MathUtils.clamp(t.x, -limX, limX)
      const cz2 = THREE.MathUtils.clamp(t.z, -limZ, limZ)
      if (cx2 !== t.x || cz2 !== t.z) {
        camera.position.x += cx2 - t.x
        camera.position.z += cz2 - t.z
        t.set(cx2, t.y, cz2)
      }
    }
    controls.addEventListener('change', clampTarget)

    const dolly = (k: number) => {
      controls.autoRotate = false
      const off = camera.position.clone().sub(controls.target)
      const len = THREE.MathUtils.clamp(off.length() * k, controls.minDistance, controls.maxDistance)
      camera.position.copy(controls.target).add(off.setLength(len))
    }
    const orbit = (a: number) => {
      controls.autoRotate = false
      const off = camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), a)
      camera.position.copy(controls.target).add(off)
    }
    const right = new THREE.Vector3()
    const fwd = new THREE.Vector3()
    const pan = (dx: number, dy: number) => {
      if (fly || flyT < 1) return
      controls.autoRotate = false
      hover.current(null)
      const dist = camera.position.distanceTo(controls.target)
      const k = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / (el.clientHeight || 1)
      camera.getWorldDirection(fwd)
      const tilt = Math.max(0.35, Math.abs(fwd.y))
      fwd.setY(0).normalize()
      right.set(-fwd.z, 0, fwd.x)
      const move = right.multiplyScalar(dx * k).add(fwd.multiplyScalar((-dy * k) / tilt))
      camera.position.add(move)
      controls.target.add(move)
      clampTarget()
    }
    const unbindWheel = bindWheel(renderer.domElement, {
      pan,
      zoom: (e) => dolly(Math.exp(e.deltaY * 0.01)),
      hint: () => hintRef.current(HINT.wheel('посёлок')),
    })
    const unbindTouch = bindTouch(renderer.domElement, () => hintRef.current(HINT.touch('посёлок')))
    const fingerDown = (e: PointerEvent) => e.pointerType !== 'mouse' && (controls.enableZoom = true)
    const fingerUp = (e: PointerEvent) => e.pointerType !== 'mouse' && (controls.enableZoom = false)
    renderer.domElement.addEventListener('pointerdown', fingerDown, { capture: true })
    renderer.domElement.addEventListener('pointerup', fingerUp)
    renderer.domElement.addEventListener('pointercancel', fingerUp)
    let gestureScale = 1
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      gestureScale = 1
    }
    const onGesture = (e: Event) => {
      e.preventDefault()
      const s = (e as unknown as { scale: number }).scale
      dolly(gestureScale / s)
      gestureScale = s
    }
    renderer.domElement.addEventListener('gesturestart', onGestureStart)
    renderer.domElement.addEventListener('gesturechange', onGesture)

    // picking + highlight: кольца + перекраска инстансов бордюров/газонов
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let hovered: number | null = null
    let active: number | null = null
    let matched: Set<number> | null = matchRef.current ? new Set(matchRef.current) : null
    const plotByN = new Map(layout.plots.map((p) => [p.n, p]))
    const paintSel = () => {
      layout.plots.forEach((p, i) => {
        const off = !!matched && !matched.has(p.n)
        const isActive = p.n === active
        const isHover = p.n === hovered
        const edge = new THREE.Color(EDGE[off ? 'na' : p.status])
        if (isActive) edge.lerp(new THREE.Color('#ffffff'), 0.35)
        else if (isHover) edge.lerp(new THREE.Color('#ffffff'), 0.2)
        for (let k = 0; k < 4; k++) curbs.setColorAt(i * 4 + k, edge)
        const lc = lawnBase[i].clone()
        if (off) lc.lerp(new THREE.Color('#b8b2a6'), 0.55)
        if (isActive) lc.lerp(new THREE.Color('#3d6b44'), 0.4)
        else if (isHover) lc.lerp(new THREE.Color('#8a7442'), 0.35)
        lawns.setColorAt(i, lc)
        priceTags.get(p.n)?.classList.toggle('is-off', off)
      })
      curbs.instanceColor!.needsUpdate = true
      lawns.instanceColor!.needsUpdate = true
      const hp = hovered != null ? plotByN.get(hovered) : undefined
      ringHover.visible = !!hp
      if (hp) ringAt(ringHover, hp)
      const ap = active != null ? plotByN.get(active) : undefined
      ringActive.visible = !!ap
      if (ap) ringAt(ringActive, ap)
    }
    const pick = (ev: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(pickables, false)[0]
      return (hit?.object.userData.n as number | undefined) ?? null
    }
    let downAt: { x: number; y: number } | null = null
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType !== 'mouse') return
      if (ev.buttons) {
        hover.current(null)
        return
      }
      const n = pick(ev)
      if (n) controls.autoRotate = false
      if (n !== hovered) {
        hovered = n
        renderer.domElement.style.cursor = n ? 'pointer' : 'grab'
        paintSel()
      }
      hover.current(n, ev.clientX, ev.clientY)
    }
    const onLeave = (ev: PointerEvent) => {
      if (ev.pointerType !== 'mouse') return
      hovered = null
      paintSel()
      hover.current(null)
    }
    const onDown = (ev: PointerEvent) => (downAt = { x: ev.clientX, y: ev.clientY })
    const onUp = (ev: PointerEvent) => {
      if (!downAt || Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 6) return
      const n = pick(ev)
      if (n) select.current(n, ev.pointerType, ev.clientX, ev.clientY)
    }
    const onStart = () => hover.current(null)
    controls.addEventListener('start', onStart)
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerleave', onLeave)
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    // fly-to: camera glides to the front of the chosen house (used before opening its page)
    let fly: { from: THREE.Vector3; to: THREE.Vector3; look0: THREE.Vector3; look1: THREE.Vector3; t: number; done: () => void } | null = null
    api.current = {
      highlight: (n) => {
        active = n
        paintSel()
      },
      filter: (m) => {
        matched = m ? new Set(m) : null
        paintSel()
      },
      zoom: dolly,
      rotate: orbit,
      reset: () => {
        controls.autoRotate = false
        fly = { from: camera.position.clone(), to: end.clone(), look0: controls.target.clone(), look1: target.clone(), t: 0, done: () => (controls.enabled = true) }
      },
    }
    if (flyRef)
      flyRef.current = (n) =>
        new Promise<void>((resolve) => {
          const h = housesAt.get(n)
          if (!h || reduce) return resolve()
          controls.autoRotate = false
          controls.enabled = false
          const look1 = h.pos.clone().setY(h.h * 0.45 + 0.5)
          const to = h.pos.clone().add(new THREE.Vector3(span * 0.04, h.h * 1.1 + 2, h.front * (h.h * 2.6 + 6)))
          fly = { from: camera.position.clone(), to, look0: controls.target.clone(), look1, t: 0, done: resolve }
        })

    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!visible) return
      if (fly) {
        fly.t = Math.min(1, fly.t + dt / 1.25)
        const e = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - Math.pow(-2 * fly.t + 2, 3) / 2
        camera.position.lerpVectors(fly.from, fly.to, e)
        const look = fly.look0.clone().lerp(fly.look1, e)
        camera.lookAt(look)
        controls.target.copy(look)
        if (fly.t === 1) {
          const done = fly.done
          fly = null
          done()
        }
      } else if (flyT < 1) {
        flyT = Math.min(1, flyT + dt / 1.8)
        const e = 1 - Math.pow(1 - flyT, 3)
        camera.position.lerpVectors(start, end, e)
        camera.lookAt(target)
        if (flyT === 1) controls.enabled = true
      } else {
        controls.enabled = true
        controls.update()
      }
      renderer.render(scene, camera)
      labels.render(scene, camera)
    }
    raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      labels.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      unbindWheel()
      unbindTouch()
      renderer.domElement.removeEventListener('pointerdown', fingerDown, { capture: true })
      renderer.domElement.removeEventListener('pointerup', fingerUp)
      renderer.domElement.removeEventListener('pointercancel', fingerUp)
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('change', clampTarget)
      renderer.domElement.removeEventListener('gesturestart', onGestureStart)
      renderer.domElement.removeEventListener('gesturechange', onGesture)
      controls.dispose()
      renderer.domElement.removeEventListener('pointerleave', onLeave)
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      const mats = new Set<THREE.Material>()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        const mt = m.material as THREE.Material | THREE.Material[] | undefined
        ;(Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => mats.add(x))
      })
      merged.forEach((g) => g.dispose())
      mats.forEach((m) => {
        const sm = m as THREE.MeshStandardMaterial
        sm.map?.dispose()
        m.dispose()
      })
      for (const t of [texBrick, texRoof, texLawn, texPaver]) t.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      labels.domElement.remove()
      api.current = null
      if (flyRef) flyRef.current = null
    }
  }, [layout, onFail, flyRef])

  useEffect(() => {
    api.current?.highlight(activeN)
  }, [activeN])

  useEffect(() => {
    matchRef.current = match
    api.current?.filter(match)
  }, [match])

  return (
    <div className="g3" role="img" aria-label="3D-генплан посёлка. Двигайте двумя пальцами, нажмите на дом.">
      <div ref={box} className="g3__stage" />
      <span className="g3__hint">
        {coarse ? 'Двумя пальцами — двигать и приближать · нажмите на дом' : 'Мышью или двумя пальцами на тачпаде — двигать · щипок или Ctrl+колесо — приблизить'}
      </span>
      <div className={`map-hint ${hintState.on ? 'is-on' : ''}`} aria-hidden>
        {hintState.text}
      </div>
      <div className="g3__ctrl" role="group" aria-label="Управление 3D-видом">
        <button type="button" aria-label="Приблизить" onClick={() => api.current?.zoom(0.75)}>
          +
        </button>
        <button type="button" aria-label="Отдалить" onClick={() => api.current?.zoom(1.33)}>
          −
        </button>
        <button type="button" aria-label="Повернуть влево" onClick={() => api.current?.rotate(-0.35)}>
          ⟲
        </button>
        <button type="button" aria-label="Повернуть вправо" onClick={() => api.current?.rotate(0.35)}>
          ⟳
        </button>
        <button type="button" aria-label="Показать весь посёлок" onClick={() => api.current?.reset()}>
          ⤢
        </button>
      </div>
    </div>
  )
}
