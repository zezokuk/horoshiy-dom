'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { HINT, bindTouch, bindWheel, useHint } from '@/lib/gestures'
import { EDGE, PAD, STREET, W, footprint, type Layout, type Plot } from '@/lib/genplan'
import { PALETTE, buildHouse, houseMaterials } from '@/lib/house3d'

const S = 0.1 // 1000 layout units → 100 m of scene

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
  const [hint, showHint] = useHint()
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
    scene.background = new THREE.Color('#ece4d6')
    scene.fog = new THREE.Fog('#ece4d6', 150, 360)

    const cx = W / 2
    const cz = layout.height / 2
    const X = (x: number) => (x - cx) * S
    const Z = (y: number) => (y - cz) * S
    const span = Math.max(W, layout.height) * S

    scene.add(new THREE.HemisphereLight('#fffaf0', '#8d8a78', 1.45))
    const sun = new THREE.DirectionalLight('#ffe9cc', 2.5)
    sun.position.set(span * 0.5, span * 0.9, span * 0.35)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: span * 3 })
    sun.shadow.bias = -0.0005
    scene.add(sun)

    const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra })
    const add = (m: THREE.Object3D) => (scene.add(m), m)

    // ground, sidewalk base
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat('#d9cfbd'))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    add(ground)
    const base = new THREE.Mesh(new THREE.BoxGeometry(W * S + 4, 0.2, layout.height * S + 4), mat('#e4ddd0'))
    base.position.y = 0.1
    base.receiveShadow = true
    add(base)

    // asphalt streets with edge lines
    const asphalt = mat('#6f6b66', { roughness: 0.95 })
    const paint = mat('#f3efe6')
    for (const s of layout.streets) {
      const len = (W - PAD * 2 + 20) * S
      const wid = (STREET - 16) * S
      const zc = Z(s.y + STREET / 2)
      const road = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, wid), asphalt)
      road.position.set(0, 0.26, zc)
      road.receiveShadow = true
      add(road)
      for (const dz of [-wid / 2 + 0.25, wid / 2 - 0.25]) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(len - 1, 0.02, 0.12), paint)
        line.position.set(0, 0.33, zc + dz)
        add(line)
      }
      for (let x = -len / 2 + 2; x < len / 2 - 2; x += 3.2) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.14), paint)
        d.position.set(x + 0.75, 0.33, zc)
        add(d)
      }
    }

    // commercial buildings: stone base + glass, as in the developer's render
    const stone = mat('#8f8476')
    const glass = mat('#7f97a0', { roughness: 0.15, metalness: 0.35 })
    const flat = mat('#d8d3c9')
    for (const c of layout.comm) {
      const w = c.w * S * 0.9
      const d = c.h * S * 0.78
      const x = X(c.x + c.w / 2)
      const z = Z(c.y + c.h / 2)
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), stone)
      b1.position.set(x, 1.3, z)
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), glass)
      b2.position.set(x, 3.7, z)
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.35, d + 0.4), flat)
      top.position.set(x, 5.2, z)
      for (const m of [b1, b2, top]) {
        m.castShadow = m.receiveShadow = true
        add(m)
      }
    }

    // plots: lawn + status curb + driveway, house from the shared model
    const pickables: THREE.Object3D[] = []
    const housesAt = new Map<number, { pos: THREE.Vector3; front: number; h: number }>()
    const curbMats = new Map<number, THREE.MeshStandardMaterial>()
    const lawnMats = new Map<number, THREE.MeshStandardMaterial>()
    const statusAt = new Map<number, Plot['status']>()
    const priceTags = new Map<number, HTMLDivElement>()
    const mLive = houseMaterials(false)
    const mDim = houseMaterials(true)
    const paving = mat(PALETTE.paving)
    const hedge = mat('#617c52')
    const carColors = ['#e9e6df', '#3a3f44', '#7d1f22', '#2f4b6e', '#b8bcc0'].map((c) => mat(c, { roughness: 0.35, metalness: 0.4 }))
    const carGlass = mat('#2a3236', { roughness: 0.1, metalness: 0.5 })

    layout.plots.forEach((p: Plot) => {
      const tag = (o: THREE.Object3D) => (o.traverse((c) => (c.userData.n = p.n)), o)
      const lawnMat = mat(PALETTE.lawn)
      lawnMats.set(p.n, lawnMat)
      const lawn = new THREE.Mesh(new THREE.BoxGeometry(p.w * S, 0.28, p.h * S), lawnMat)
      lawn.position.set(X(p.x + p.w / 2), 0.34, Z(p.y + p.h / 2))
      lawn.receiveShadow = true
      add(tag(lawn))
      pickables.push(lawn)

      // status curb: four thin raised borders
      const curb = mat(EDGE[p.status], { roughness: 0.6 })
      curbMats.set(p.n, curb)
      statusAt.set(p.n, p.status)
      const cw = p.w * S
      const ch = p.h * S
      for (const [w, d, ox, oz] of [
        [cw, 0.25, 0, -ch / 2],
        [cw, 0.25, 0, ch / 2],
        [0.25, ch, -cw / 2, 0],
        [0.25, ch, cw / 2, 0],
      ]) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, d), curb)
        c.position.set(lawn.position.x + ox, 0.42, lawn.position.z + oz)
        add(tag(c))
      }

      const { hx, hy, hw, hh } = footprint(p)
      const a = hw * S
      const b = hh * S
      const hxC = X(hx + hw / 2)
      const hzC = Z(hy + hh / 2)
      // three shapes, as the client asked («вроде они одинаковые, а дома разные»): one storey, an attic floor
      // under a steep roof (most types), two full storeys (Тип 9, 10). Without a project — by area, as before
      const storeys = p.unit?.storeys ?? ((p.unit?.area ?? 0) >= 140 ? 2 : 1)
      const attic = storeys === 1 && !!p.unit?.mansard
      const house = buildHouse(a, b, storeys, p.status === 'na' ? mDim : mLive, attic)
      house.group.position.set(hxC, 0.48, hzC)
      house.group.rotation.y = p.flip ? 0 : Math.PI // front door faces the street
      add(tag(house.group))
      house.group.traverse((c) => (c as THREE.Mesh).isMesh && pickables.push(c))
      housesAt.set(p.n, { pos: new THREE.Vector3(hxC, 0, hzC), front: p.flip ? 1 : -1, h: house.height })

      // driveway along the side of the house, from the street to the back wall; hedge at the back
      const streetZ = p.flip ? Z(p.y + p.h) - 0.4 : Z(p.y) + 0.4
      const backWall = p.flip ? hzC - b / 2 : hzC + b / 2
      const side = (cw - a) / 2
      const dwW = Math.max(1.6, Math.min(2.8, side - 0.4))
      const dw = new THREE.Mesh(new THREE.BoxGeometry(dwW, 0.06, Math.abs(streetZ - backWall)), paving)
      dw.position.set(hxC + a / 2 + side / 2, 0.5, (streetZ + backWall) / 2)
      dw.receiveShadow = true
      add(tag(dw))
      const backZ = p.flip ? Z(p.y) + 0.6 : Z(p.y + p.h) - 0.6
      const hg = new THREE.Mesh(new THREE.BoxGeometry(cw - 1.2, 0.9, 0.6), hedge)
      hg.position.set(lawn.position.x, 0.9, backZ)
      hg.castShadow = true
      add(tag(hg))

      // lived-in feel: cars on some sold plots
      if (p.status !== 'free' && rand(p.n + 11) < 0.55) {
        const car = new THREE.Group()
        const bodyM = carColors[Math.floor(rand(p.n) * carColors.length)]
        const k = Math.min(1, dwW / 2.1) // narrow plots get a compact car
        car.scale.setScalar(k)
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), bodyM)
        body.position.y = 0.65
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), carGlass)
        cab.position.set(0, 1.25, -0.2)
        body.castShadow = cab.castShadow = true
        car.add(body, cab)
        car.position.set(dw.position.x, 0.48, streetZ + (p.flip ? -3 : 3))
        add(tag(car))
      }

      if (p.unit && p.status === 'free') {
        const div = document.createElement('div')
        div.className = 'g3-label'
        div.textContent = `${(p.unit.price / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн`
        priceTags.set(p.n, div)
        const label = new CSS2DObject(div)
        label.position.set(hxC, 0.48 + house.height + 1.8, hzC)
        add(label)
      }
    })

    // trees around the estate and in some back yards
    const treeSpots: [number, number, number][] = []
    const wS = W * S
    const hS = layout.height * S
    for (let t = 0; t < 80; t++) {
      const side = t % 4
      const k = rand(t + 1)
      const off = 4 + rand(t + 50) * 12
      const x = side < 2 ? -wS / 2 + k * wS : side === 2 ? -wS / 2 - off : wS / 2 + off
      const z = side === 0 ? -hS / 2 - off : side === 1 ? hS / 2 + off : -hS / 2 + k * hS
      treeSpots.push([x, z, 0.8 + rand(t + 99) * 0.6])
    }
    layout.plots.forEach((p, i) => {
      if (rand(i + 7) < 0.45) {
        const yard = p.flip ? p.y + 20 : p.y + p.h - 20
        treeSpots.push([X(p.x + 12 + rand(i) * 20), Z(yard), 0.5 + rand(i + 3) * 0.2])
      }
    })
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 0), mat('#5c7a4f', { flatShading: true }), treeSpots.length)
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.2, 1.6, 6), mat('#6b5444'), treeSpots.length)
    const m4 = new THREE.Matrix4()
    treeSpots.forEach(([x, z, s], i) => {
      m4.compose(new THREE.Vector3(x, 2.8 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.15, s))
      crowns.setMatrixAt(i, m4)
      m4.compose(new THREE.Vector3(x, 0.8 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s))
      trunks.setMatrixAt(i, m4)
    })
    crowns.castShadow = trunks.castShadow = true
    add(crowns)
    add(trunks)

    // nothing in the village moves: freeze matrices once instead of recomputing ~1500 of them every frame
    scene.traverse((o) => {
      o.updateMatrix()
      o.matrixAutoUpdate = false
    })

    // camera + controls with a short fly-in
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.5, 1200)
    const target = new THREE.Vector3(0, 0, 0)
    const end = new THREE.Vector3(span * 0.22, span * (small ? 0.78 : 0.44), span * (small ? 0.78 : 0.52))
    const start = end.clone().multiplyScalar(1.9).add(new THREE.Vector3(-span * 0.8, span * 0.4, 0))
    camera.position.copy(reduce ? end : start)
    camera.lookAt(target)

    // Map-like controls: drag = move, right-drag / two-finger twist = rotate.
    // Wheel gestures (touchpad pan, pinch, mouse wheel) are handled by lib/gestures below.
    const controls = new MapControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.screenSpacePanning = false // move along the ground, like a map
    controls.enableZoom = false // own wheel handler below
    controls.maxPolarAngle = 1.22
    controls.minDistance = span * 0.12
    controls.maxDistance = span * 1.8
    controls.target.copy(target)
    controls.autoRotate = !reduce
    controls.autoRotateSpeed = 0.45
    controls.enabled = false
    // touch: one finger scrolls the page (and taps houses), two fingers move/zoom the village — like Google Maps embeds
    controls.touches = { TWO: THREE.TOUCH.DOLLY_PAN }
    renderer.domElement.style.touchAction = 'pan-y'
    let flyT = reduce ? 1 : 0
    controls.addEventListener('start', () => (controls.autoRotate = false))
    // keep the target over the estate so the village can't be dragged off-screen
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
    // Touchpad two-finger scroll: slide the camera over the ground. The deltas are screen pixels; the village follows
    // the fingers the way a page does (fingers up → content up).
    const right = new THREE.Vector3()
    const fwd = new THREE.Vector3()
    const pan = (dx: number, dy: number) => {
      if (fly || flyT < 1) return
      controls.autoRotate = false
      hover.current(null)
      const dist = camera.position.distanceTo(controls.target)
      const k = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / (el.clientHeight || 1) // metres per pixel at the target
      camera.getWorldDirection(fwd)
      const tilt = Math.max(0.35, Math.abs(fwd.y)) // a low camera sees the ground foreshortened: move it further per pixel
      fwd.setY(0).normalize()
      right.set(-fwd.z, 0, fwd.x) // screen right on the ground
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
    // Pinch on a phone goes through the controls (TWO: DOLLY_PAN), which only zoom while enableZoom is on — but then
    // they would also zoom on every mouse wheel. So zoom is on only while fingers touch the canvas. Capture phase:
    // runs before the controls' own pointerdown, which decides whether this touch will zoom.
    const fingerDown = (e: PointerEvent) => e.pointerType !== 'mouse' && (controls.enableZoom = true)
    const fingerUp = (e: PointerEvent) => e.pointerType !== 'mouse' && (controls.enableZoom = false)
    renderer.domElement.addEventListener('pointerdown', fingerDown, { capture: true })
    renderer.domElement.addEventListener('pointerup', fingerUp)
    renderer.domElement.addEventListener('pointercancel', fingerUp)
    // Safari (Mac) sends trackpad pinch as gesture events
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

    // picking + highlight
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let hovered: number | null = null
    let active: number | null = null
    let matched: Set<number> | null = matchRef.current ? new Set(matchRef.current) : null
    const paintSel = () => {
      curbMats.forEach((m, n) => {
        const off = !!matched && !matched.has(n)
        m.color.set(EDGE[off ? 'na' : (statusAt.get(n) ?? 'na')])
        priceTags.get(n)?.classList.toggle('is-off', off)
        const on = n === active || n === hovered
        m.emissive.set(on ? (n === active ? '#4f8a5b' : '#c9a86a') : '#000000')
        m.emissiveIntensity = on ? 0.8 : 0
      })
      lawnMats.forEach((m, n) => {
        m.emissive.set(n === active ? '#3d6b44' : n === hovered ? '#8a7442' : '#000000')
        m.emissiveIntensity = n === active || n === hovered ? 0.35 : 0
      })
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
      if (n) controls.autoRotate = false // the visitor is looking at a house — stop the showcase spin
      if (n !== hovered) {
        hovered = n
        renderer.domElement.style.cursor = n ? 'pointer' : 'grab'
        paintSel()
      }
      hover.current(n, ev.clientX, ev.clientY)
    }
    const onLeave = (ev: PointerEvent) => {
      // a finger lifted after a tap also «leaves» the canvas: that must not hide the card the tap just opened
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
      renderer.render(scene, camera) // a resize clears the canvas — redraw now, not next frame
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
      mats.forEach((m) => m.dispose())
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
      <div className={`map-hint ${hint.on ? 'is-on' : ''}`} aria-hidden>
        {hint.text}
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
