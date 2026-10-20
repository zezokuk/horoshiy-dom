'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { hipRoofGeometry } from '@/lib/house3d'
import { FLOORS, FURNITURE, PLAN_CENTER, PLANTS, PX_PER_M, ROOFS, TERRACE, WALLS, type Side } from '@/lib/tip5-plan'

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
const SILL = 0.9
const LINTEL = 2.15
const DOOR = 2.1

const C = {
  sketch: '#fbf8f2',
  wall: '#f4efe6',
  brick: '#b4623f',
  cut: '#efe6d6',
  line: '#3b3a35',
  slab: '#cfc8bb',
  oak: '#d6b48a',
  deck: '#a77b52',
  sand: '#e6d8bf',
  lawn: '#a3b285',
  roof: '#4a4744',
  glass: '#a9c2c9',
  oat: '#e2d6c2',
  linen: '#f3eee4',
  walnut: '#6b4a30',
  olive: '#55613f',
  white: '#f7f4ee',
  rug: '#e9dfcc',
  leaf: '#6f8460',
  trunk: '#6b5444',
}

/**
 * Scroll-driven construction of the «Тип 5» house as an architectural model (reference: a floor plan that rises
 * from a line sketch into a furnished cutaway). The real room layout is traced from the client's plan.
 * Plan lines on paper → foundation → walls as a white sketch with outlines → roof and brick → windows →
 * the roof lifts off like a dollhouse lid: oak floors, furniture, lawn and trees. `progress` (0..1) comes from the sticky section.
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
    el.appendChild(renderer.domElement)

    const labels = new CSS2DRenderer()
    labels.setSize(el.clientWidth, el.clientHeight)
    labels.domElement.className = 'build3d__labels'
    el.appendChild(labels.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(28, el.clientWidth / el.clientHeight, 0.1, 300)
    const frame = (w: number, h: number) => {
      camera.aspect = w / h
      const s = shiftRef.current
      if (s) camera.setViewOffset(w, h, -s.x * w, s.y * h, w, h)
      else camera.clearViewOffset()
      camera.updateProjectionMatrix()
    }
    frame(el.clientWidth, el.clientHeight)

    scene.add(new THREE.HemisphereLight('#fffaf0', '#b9b09c', 1.9))
    const sun = new THREE.DirectionalLight('#fff1dc', 2.2)
    sun.position.set(-10, 22, 14)
    sun.castShadow = true
    sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    sun.shadow.bias = -0.0004
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, far: 70 })
    scene.add(sun)

    const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra })
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], shadow = true) => {
      const m = new THREE.Mesh(geo, mat)
      m.castShadow = shadow
      m.receiveShadow = true
      return m
    }
    const lineMat = new THREE.LineBasicMaterial({ color: C.line, transparent: true })
    const outline = (m: THREE.Mesh) => {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), lineMat)
      m.add(l)
      return m
    }

    // the paper: only shadows fall on it, the page gradient shows through
    const shadowGround = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.16 }))
    shadowGround.rotation.x = -Math.PI / 2
    shadowGround.position.y = -0.32
    shadowGround.receiveShadow = true
    scene.add(shadowGround)

    // the plot: a diorama base, sand that turns into a lawn
    const plotMat = std(C.sand, { roughness: 1 })
    const plot = mesh(new THREE.BoxGeometry(22, 0.3, 21), plotMat, false)
    plot.position.set(0, -0.15, 0.6)
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
      const s = outline(mesh(new THREE.BoxGeometry(w, SLAB, d), [slabMat, slabMat, floorMat, slabMat, slabMat, slabMat]))
      s.position.set((mx(x1) + mx(x2)) / 2, SLAB / 2, (mz(y1) + mz(y2)) / 2)
      foundation.add(s)
    }
    scene.add(foundation)

    // 3. walls: every segment split around its windows and doors; exterior walls brick outside, white inside
    const whiteMat = std(C.sketch)
    const brickMat = std(C.sketch)
    const cutMat = std(C.cut)
    const glassMat = std(C.glass, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.5 })
    const walls = new THREE.Group()
    walls.position.y = SLAB
    const glass = new THREE.Group()
    glass.position.y = SLAB
    const faces = (horiz: boolean, out?: Side) => {
      // BoxGeometry groups: +x, -x, +y, -y, +z, -z
      const m: THREE.Material[] = [whiteMat, whiteMat, cutMat, whiteMat, whiteMat, whiteMat]
      if (out === 'e') m[0] = brickMat
      if (out === 'w') m[1] = brickMat
      if (out === 's') m[4] = brickMat
      if (out === 'n') m[5] = brickMat
      if (out && horiz) m[0] = m[1] = brickMat
      if (out && !horiz) m[4] = m[5] = brickMat
      return m
    }
    for (const w of WALLS) {
      const horiz = w.a[1] === w.b[1]
      const [from, to] = horiz ? [w.a[0], w.b[0]] : [w.a[1], w.b[1]]
      const across = horiz ? w.a[1] : w.a[0]
      const t = w.t / PX_PER_M
      const mats = faces(horiz, w.out)
      // pieces along the wall: [start px, end px, bottom m, top m]
      const pieces: [number, number, number, number][] = []
      let cur = from
      for (const [o1, o2, kind] of [...(w.open || [])].sort((p, q) => p[0] - q[0])) {
        if (o1 > cur) pieces.push([cur, o1, 0, H])
        if (kind === 'w') pieces.push([o1, o2, 0, SILL])
        pieces.push([o1, o2, kind === 'w' ? LINTEL : DOOR, H])
        if (kind === 'w') {
          const len = (o2 - o1) / PX_PER_M
          const g = mesh(new THREE.BoxGeometry(horiz ? len : 0.04, LINTEL - SILL, horiz ? 0.04 : len), glassMat, false)
          const c = (o1 + o2) / 2
          g.position.set(horiz ? mx(c) : mx(across), (SILL + LINTEL) / 2, horiz ? mz(across) : mz(c))
          glass.add(g)
        }
        cur = o2
      }
      if (cur < to) pieces.push([cur, to, 0, H])
      for (const [s, e, y1, y2] of pieces) {
        const len = (e - s) / PX_PER_M
        const box = outline(mesh(new THREE.BoxGeometry(horiz ? len : t, y2 - y1, horiz ? t : len), mats))
        const c = (s + e) / 2
        box.position.set(horiz ? mx(c) : mx(across), (y1 + y2) / 2, horiz ? mz(across) : mz(c))
        walls.add(box)
      }
    }
    scene.add(walls, glass)

    // 4. the roof: two hip roofs, dropped on, later lifted off
    const roofMat = std(C.roof, { roughness: 0.6, side: THREE.DoubleSide, transparent: true })
    const roof = new THREE.Group()
    for (const [x1, y1, x2, y2] of ROOFS) {
      const w = mx(x2) - mx(x1) + 0.9
      const d = mz(y2) - mz(y1) + 0.9
      const r = mesh(hipRoofGeometry(w, d, Math.min(w, d) * 0.38), roofMat)
      r.position.set((mx(x1) + mx(x2)) / 2, 0, (mz(y1) + mz(y2)) / 2)
      roof.add(r)
    }
    const roofY = SLAB + H
    scene.add(roof)

    // 5. moving in: terrace deck, furniture, plants, trees
    const deckMat = std(C.deck, { roughness: 0.8 })
    const deck = mesh(new THREE.BoxGeometry(mx(TERRACE[2]) - mx(TERRACE[0]), 0.16, mz(TERRACE[3]) - mz(TERRACE[1])), deckMat, false)
    deck.position.set((mx(TERRACE[0]) + mx(TERRACE[2])) / 2, 0.08, (mz(TERRACE[1]) + mz(TERRACE[3])) / 2)
    scene.add(deck)
    const fMats = {
      oat: std(C.oat),
      linen: std(C.linen),
      walnut: std(C.walnut, { roughness: 0.6 }),
      olive: std(C.olive),
      white: std(C.white, { roughness: 0.5 }),
      rug: std(C.rug, { roughness: 1 }),
    }
    const pieces: THREE.Object3D[] = []
    for (const [x1, y1, x2, y2, h, m] of FURNITURE) {
      const p = mesh(new THREE.BoxGeometry(mx(x2) - mx(x1), h, mz(y2) - mz(y1)), fMats[m], h > 0.05)
      p.geometry.translate(0, h / 2, 0) // grow from the floor
      const onTerrace = y2 <= TERRACE[3] && x2 <= TERRACE[2]
      p.position.set((mx(x1) + mx(x2)) / 2, onTerrace ? 0.16 : SLAB, (mz(y1) + mz(y2)) / 2)
      scene.add(p)
      pieces.push(p)
    }
    const leaf = std(C.leaf, { roughness: 0.8 })
    const pot = std('#d9cdb8')
    for (const [x, y, s] of PLANTS) {
      const g = new THREE.Group()
      const potM = mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.4, 16), pot)
      potM.position.y = 0.2
      const crown = mesh(new THREE.SphereGeometry(0.42, 16, 12), leaf)
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
    const trees = (
      [
        [-9, -6.5, 1.2],
        [8.8, -7.4, 1],
        [-9.2, 7.6, 0.9],
        [9.3, 8.2, 1.1],
      ] as const
    ).map(([x, z, s]) => {
      const t = new THREE.Group()
      const c = mesh(new THREE.SphereGeometry(1.25, 20, 14), leaf)
      c.position.y = 2.9
      c.scale.set(1, 1.15, 1)
      const tr = mesh(new THREE.CylinderGeometry(0.13, 0.18, 2.2, 8), std(C.trunk))
      tr.position.y = 1.1
      t.add(c, tr)
      t.position.set(x, 0, z)
      t.userData.s = s
      scene.add(t)
      return t
    })
    // a path from the porch to the edge of the plot
    const path = mesh(new THREE.BoxGeometry(1.3, 0.04, 10.6 - mz(1290)), std('#ddd3c2'), false)
    path.position.set(mx(770), 0.02, (mz(1290) + 10.6) / 2 + 0.05)
    scene.add(path)

    const tag = document.createElement('div')
    tag.className = 'build3d__tag'
    tag.textContent = 'Здесь будет ваш дом'
    const tagObj = new CSS2DObject(tag)
    tagObj.position.set(0, 3.2, 0)
    scene.add(tagObj)

    const sketch = new THREE.Color(C.sketch)
    const colour = (mat: THREE.MeshStandardMaterial, to: string, k: number) => mat.color.copy(sketch).lerp(new THREE.Color(to), k)
    const sand = new THREE.Color(C.sand)
    const lawn = new THREE.Color(C.lawn)
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

      // walls rise as a white sketch; then they get brick (with the roof) and settle to a cutaway height when the roof lifts
      walls.visible = w > 0.001
      walls.scale.y = Math.max(0.001, w * (1 - 0.3 * y))
      colour(brickMat, C.brick, r)
      colour(whiteMat, C.wall, r)
      lineMat.opacity = 0.9 - 0.6 * r

      // the roof drops on, then lifts away like a lid
      roof.visible = r > 0.001 && y < 0.999
      roof.position.y = roofY + (1 - r) * 7 + y * 9
      roofMat.opacity = Math.min(r, 1 - y)
      roofMat.depthWrite = roofMat.opacity > 0.95

      glass.visible = o > 0.01
      glass.scale.set(1, Math.max(0.001, o * (1 - 0.3 * y)), 1)

      floorMat.color.copy(slabC).lerp(oak, y)
      plotMat.color.copy(sand).lerp(lawn, y)
      deck.visible = y > 0.01
      deck.scale.set(1, Math.max(0.001, y), 1)
      path.visible = y > 0.01
      pieces.forEach((pc, i) => {
        const k = ease(clamp(y * 1.8 - (i / pieces.length) * 0.8))
        pc.visible = k > 0.001
        pc.scale.setScalar(Math.max(0.001, k * (pc.userData.s ?? 1)))
      })
      trees.forEach((t, i) => t.scale.setScalar(Math.max(0.001, ease(clamp(y * 1.6 - i * 0.12)) * t.userData.s)))

      // camera: a low three-quarter view while building, rising to look into the cutaway at the end
      const ang = -0.62 + p * 0.5
      const tilt = 0.5 + 0.32 * ease(phase(p, 0.55, 1))
      // a tall phone screen sees a narrow slice: step back so the whole plot fits across
      const k = Math.min(2.4, Math.max(1, 1.15 / camera.aspect))
      const dist = (40 - p * 4) * k
      camera.position.set(Math.sin(ang) * Math.cos(tilt) * dist, Math.sin(tilt) * dist, Math.cos(ang) * Math.cos(tilt) * dist)
      camera.lookAt(0, 1, 0.4)
    }

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
      mats.forEach((m) => m.dispose())
      renderer.dispose()
      renderer.domElement.remove()
      labels.domElement.remove()
    }
  }, [progress])

  return <div ref={host} className="build3d__canvas" aria-hidden />
}
