'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { PALETTE, blueprintPoints, buildHouse, houseMaterials } from '@/lib/house3d'

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const phase = (p: number, from: number, to: number) => clamp((p - from) / (to - from))
const ease = (k: number) => 1 - Math.pow(1 - k, 3)

/** Start of each step, 0..1 of the build (BuildStory's ENDS: the end of each step; keep them in sync). */
const BUILD_STEPS = [0, 0.03, 0.16, 0.36, 0.52, 0.64]

/**
 * Scroll-driven construction of a typical house on a real-looking street.
 * From the first frame the scene is never empty: built neighbours, lawns, trees and a road around,
 * an empty plot with survey stakes, the blueprint and a translucent «ghost» of the future house.
 * Then: foundation → walls → roof → windows → yard. `progress` (0..1) comes from the sticky section.
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    el.appendChild(renderer.domElement)

    const labels = new CSS2DRenderer()
    labels.setSize(el.clientWidth, el.clientHeight)
    labels.domElement.className = 'build3d__labels'
    el.appendChild(labels.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#efe4d1', 70, 170) // horizon melts into the card background
    const camera = new THREE.PerspectiveCamera(34, el.clientWidth / el.clientHeight, 0.1, 400)
    const frame = (w: number, h: number) => {
      camera.aspect = w / h
      const s = shiftRef.current
      if (s) camera.setViewOffset(w, h, -s.x * w, s.y * h, w, h)
      else camera.clearViewOffset()
      camera.updateProjectionMatrix()
    }
    frame(el.clientWidth, el.clientHeight)

    scene.add(new THREE.HemisphereLight('#fffaf0', '#9c9581', 1.5))
    const sun = new THREE.DirectionalLight('#ffe8c8', 2.6)
    sun.position.set(16, 26, 14)
    sun.castShadow = true
    sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 30, bottom: -30, far: 120 })
    scene.add(sun)

    const A = 12
    const B = 9
    const plotW = 26
    const plotD = 24
    const plotZ = 2.5
    const roadZ = plotZ + plotD / 2 + 4.5
    const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra })

    // neighbourhood that is there from the start
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std('#a3b38c'))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)
    const road = new THREE.Mesh(new THREE.BoxGeometry(200, 0.1, 7), std('#76726c'))
    road.position.set(0, 0.05, roadZ)
    road.receiveShadow = true
    scene.add(road)
    for (let x = -96; x < 96; x += 4) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 0.16), std('#f1ece2'))
      dash.position.set(x, 0.11, roadZ)
      scene.add(dash)
    }
    const neighbourMats = houseMaterials(true)
    for (const x of [-30, 30, -60, 60]) {
      const n = buildHouse(A - (Math.abs(x) > 40 ? 1 : 0), B, 1, neighbourMats)
      n.group.position.set(x, 0, 0)
      scene.add(n.group)
      const nPath = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, roadZ - B / 2 - 3.5), std(PALETTE.paving))
      nPath.position.set(x, 0.03, (roadZ - 3.5 + B / 2) / 2)
      scene.add(nPath)
    }

    // trees: neighbours' trees exist from the start, ours grow in the yard stage
    const crown = std('#5c7a4f', { flatShading: true })
    const trunk = std('#6b5444')
    const makeTree = (x: number, z: number, s: number) => {
      const t = new THREE.Group()
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), crown)
      c.position.y = 3
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 2, 6), trunk)
      tr.position.y = 1
      c.castShadow = tr.castShadow = true
      t.add(c, tr)
      t.position.set(x, 0, z)
      t.scale.setScalar(s)
      scene.add(t)
      return t
    }
    for (const [x, z, s] of [
      [-22, -9, 1.2],
      [-40, -6, 1],
      [22, -10, 1.1],
      [41, -7, 1.3],
      [-52, -12, 0.9],
      [52, -11, 1],
      [-18, 26, 1.1],
      [24, 27, 0.9],
    ])
      makeTree(x, z, s)

    // our plot: earth patch that becomes a lawn, dashed boundary, survey stakes
    const earth = new THREE.Color('#c9b393')
    const lawn = new THREE.Color(PALETTE.lawn)
    const plotMat = std('#c9b393', { roughness: 1 })
    const plot = new THREE.Mesh(new THREE.BoxGeometry(plotW, 0.08, plotD), plotMat)
    plot.position.set(0, 0.04, plotZ)
    plot.receiveShadow = true
    scene.add(plot)
    const boundary = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-plotW / 2, 0.1, plotZ - plotD / 2),
        new THREE.Vector3(plotW / 2, 0.1, plotZ - plotD / 2),
        new THREE.Vector3(plotW / 2, 0.1, plotZ + plotD / 2),
        new THREE.Vector3(-plotW / 2, 0.1, plotZ + plotD / 2),
      ]),
      new THREE.LineDashedMaterial({ color: '#6b4a30', dashSize: 0.8, gapSize: 0.5 }),
    )
    boundary.computeLineDistances()
    scene.add(boundary)
    const stakes = new THREE.Group()
    for (const [x, z] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6), std('#d8c3a0'))
      stake.position.set((x * plotW) / 2, 0.8, plotZ + (z * plotD) / 2)
      stake.castShadow = true
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), std('#c0603f', { side: THREE.DoubleSide }))
      flag.position.set((x * plotW) / 2 + 0.45, 1.35, plotZ + (z * plotD) / 2)
      stakes.add(stake, flag)
    }
    scene.add(stakes)

    // the future house: a translucent ghost + contrasting blueprint dots
    const ghostMats = houseMaterials()
    Object.values(ghostMats).forEach((m) => {
      m.color.set('#ffffff')
      m.transparent = true
      m.opacity = 0.22
      m.depthWrite = false
    })
    const ghost = buildHouse(A, B, 1, ghostMats)
    ghost.group.traverse((c) => (c.castShadow = false))
    scene.add(ghost.group)
    const dotMat = new THREE.PointsMaterial({ color: '#2f4b3a', size: 0.24, transparent: true })
    const dotGeo = new THREE.BufferGeometry()
    dotGeo.setAttribute('position', new THREE.BufferAttribute(blueprintPoints(A, B, 1), 3))
    scene.add(new THREE.Points(dotGeo, dotMat))

    const tag = document.createElement('div')
    tag.className = 'build3d__tag'
    tag.textContent = 'Здесь будет ваш дом'
    const tagObj = new CSS2DObject(tag)
    tagObj.position.set(0, ghost.height + 2.2, 0)
    scene.add(tagObj)

    // the real house
    const house = buildHouse(A, B, 1, houseMaterials())
    scene.add(house.group)
    const roofMats: THREE.MeshStandardMaterial[] = []
    house.roof.traverse((c) => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m && !roofMats.includes(m)) roofMats.push(m)
    })

    // yard: path, drive, fence, own trees
    const yard = new THREE.Group()
    const pave = std(PALETTE.paving)
    const path = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, roadZ - B / 2 - 3.5), pave)
    path.position.set(0, 0.1, (roadZ - 3.5 + B / 2) / 2)
    const drive = new THREE.Mesh(new THREE.BoxGeometry(5, 0.06, 9), pave)
    drive.position.set(A / 2 + 4, 0.1, roadZ - 8)
    yard.add(path, drive)
    const fenceMat = std(PALETTE.fence, { roughness: 0.6 })
    const fenceZ = plotZ + plotD / 2
    for (let x = -plotW / 2; x <= plotW / 2 + 0.01; x += 1.2) {
      if (Math.abs(x) < 1.6 || Math.abs(x - (A / 2 + 4)) < 2.6) continue
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), fenceMat)
      post.position.set(x, 0.5, fenceZ)
      yard.add(post)
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(plotW, 0.1, 0.1), fenceMat)
    rail.position.set(0, 0.8, fenceZ)
    yard.add(rail)
    scene.add(yard)
    const ownTrees = [
      [-10, -7, 1.1],
      [10, -8, 0.9],
      [-11, 9, 0.8],
    ].map(([x, z, s]) => {
      const t = makeTree(x, z, s)
      t.userData.s = s
      return t
    })

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

      dotMat.opacity = 1 - ease(phase(p, 0.2, 0.42))
      Object.values(ghostMats).forEach((m) => (m.opacity = 0.22 * (1 - w)))
      ghost.group.visible = w < 0.99
      tag.style.opacity = String(1 - ease(phase(p, 0.14, 0.3)))
      boundary.visible = stakes.visible = y < 0.6

      house.foundation.scale.set(1, Math.max(0.001, f), 1)
      house.foundation.visible = f > 0.001
      house.walls.scale.set(1, Math.max(0.001, w), 1)
      house.walls.visible = w > 0.001
      house.roof.position.y = (1 - r) * 9
      house.roof.visible = r > 0.001
      roofMats.forEach((m) => {
        m.transparent = r < 1
        m.opacity = r
      })
      house.openings.visible = o > 0.01
      house.openings.scale.setScalar(Math.max(0.001, o))
      plotMat.color.copy(earth).lerp(lawn, y)
      yard.visible = y > 0.01
      ownTrees.forEach((t, i) => t.scale.setScalar(Math.max(0.001, ease(clamp(y * 1.6 - i * 0.12)) * t.userData.s)))

      // camera: wide «this is your street» shot at the start, settles closer as the house appears
      const ang = -0.7 + p * 0.95
      // a tall phone screen sees a narrow slice: step back so the whole plot fits across
      const k = Math.min(2.2, Math.max(1, 1.1 / camera.aspect))
      const dist = (50 - p * 12) * k
      camera.position.set(Math.sin(ang) * dist, (21 - p * 7) * k, plotZ + Math.cos(ang) * dist)
      camera.lookAt(0, 2.2, plotZ)
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
