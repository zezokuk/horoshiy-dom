import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type DayTime = 'day' | 'evening' | 'night'

/**
 * Точные координаты входной двери крыльца в модели khoroshiy-dom-type5.glb
 * после центрирования по X/Z и установки основания на Y=0:
 * светильники по бокам двери: X = 0.65..2.35 (центр X = 1.50), Z = 5.71;
 * ручка двери: X = 1.82, Y = 1.46, Z = 5.26.
 */
export const TYPE5_DOOR = {
  x: 1.5,
  y: 1.48,
  z: 5.26,
} as const

export type HouseSceneHandles = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  hemi: THREE.HemisphereLight
  sun: THREE.DirectionalLight
  porchLight: THREE.PointLight
  pivot: THREE.Group
  glassMats: THREE.MeshStandardMaterial[]
  sconceMats: THREE.MeshStandardMaterial[]
  size: THREE.Vector3
}

/** Создаёт WebGL-сцену Three.js для показа дома .glb с переключением суток (день / вечер / ночь). */
export function createHouseScene(
  el: HTMLElement,
  opts: {
    modelUrl?: string
    onLoaded?: (handles: HouseSceneHandles) => void
    onError?: () => void
  } = {},
): { handles: HouseSceneHandles | null; dispose: () => void } {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    opts.onError?.()
    return { handles: null, dispose: () => {} }
  }

  const w = Math.max(el.clientWidth, 320)
  const h = Math.max(el.clientHeight, 240)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  el.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, w / h, 0.15, 250)
  camera.position.set(0, 3.2, 24.5)

  const hemi = new THREE.HemisphereLight('#ffffff', '#cfc6b8', 1.22)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight('#fff5e4', 2.2)
  sun.position.set(14, 22, 16)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.025
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, far: 80 })
  scene.add(sun)

  const porchLight = new THREE.PointLight('#ffaa55', 0, 14, 1.6)
  porchLight.position.set(TYPE5_DOOR.x, 2.55, TYPE5_DOOR.z + 0.45)
  scene.add(porchLight)

  const ground = new THREE.Mesh(new THREE.CircleGeometry(26, 48), new THREE.ShadowMaterial({ opacity: 0.13 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.01
  ground.receiveShadow = true
  scene.add(ground)

  const pivot = new THREE.Group()
  scene.add(pivot)

  const glassMats: THREE.MeshStandardMaterial[] = []
  const sconceMats: THREE.MeshStandardMaterial[] = []
  const size = new THREE.Vector3(15.6, 6.6, 15.6)
  const handles: HouseSceneHandles = { renderer, scene, camera, hemi, sun, porchLight, pivot, glassMats, sconceMats, size }

  let dead = false
  const url = opts.modelUrl ?? '/models/khoroshiy-dom-type5.glb'
  new GLTFLoader().load(
    url,
    (gltf) => {
      if (dead) return
      const model = gltf.scene
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      box.getSize(size)
      model.position.set(-center.x, -box.min.y, -center.z)
      model.traverse((obj) => {
        const m = obj as THREE.Mesh
        if (!m.isMesh) return
        m.castShadow = true
        m.receiveShadow = true
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        for (const mt of mats) {
          const std = mt as THREE.MeshStandardMaterial
          if (!std) continue
          if (std.map) std.map.anisotropy = 4
          const nm = (std.name || '').toLowerCase()
          if (nm.includes('glass') || nm.includes('window')) {
            if (!glassMats.includes(std)) glassMats.push(std)
          } else if (nm.includes('sconce') || nm.includes('lens')) {
            if (!sconceMats.includes(std)) sconceMats.push(std)
          }
        }
      })
      pivot.add(model)
      applyHouseLighting(handles, 'day')
      opts.onLoaded?.(handles)
    },
    undefined,
    () => {
      if (!dead) opts.onError?.()
    },
  )

  const ro = new ResizeObserver(() => {
    if (dead) return
    const nw = el.clientWidth
    const nh = el.clientHeight
    if (!nw || !nh) return
    renderer.setSize(nw, nh)
    camera.aspect = nw / nh
    camera.updateProjectionMatrix()
  })
  ro.observe(el)

  const dispose = () => {
    dead = true
    ro.disconnect()
    const mats = new Set<THREE.Material>()
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose()
      const list = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
      list.forEach((x) => {
        mats.add(x)
        const std = x as THREE.MeshStandardMaterial
        std.map?.dispose()
      })
    })
    mats.forEach((m) => m.dispose())
    renderer.dispose()
    renderer.domElement.remove()
  }

  return { handles, dispose }
}

/** Применяет освещение времени суток и зажигает окна + фасадные светильники вечером и ночью. */
export function applyHouseLighting(h: HouseSceneHandles, mode: DayTime) {
  if (mode === 'day') {
    h.hemi.color.set('#ffffff')
    h.hemi.groundColor.set('#cfc6b8')
    h.hemi.intensity = 1.22
    h.sun.color.set('#fff5e4')
    h.sun.intensity = 2.2
    h.sun.position.set(14, 22, 16)
    h.porchLight.intensity = 0
    h.renderer.toneMappingExposure = 1.08
    h.glassMats.forEach((m) => {
      m.emissive.set('#000000')
      m.emissiveIntensity = 0
    })
    h.sconceMats.forEach((m) => {
      m.emissive.set('#000000')
      m.emissiveIntensity = 0
    })
  } else if (mode === 'evening') {
    h.hemi.color.set('#b898b0')
    h.hemi.groundColor.set('#46382c')
    h.hemi.intensity = 0.72
    h.sun.color.set('#ffb478')
    h.sun.intensity = 1.55
    h.sun.position.set(-18, 7.5, 14)
    h.porchLight.intensity = 7
    h.renderer.toneMappingExposure = 1.0
    h.glassMats.forEach((m) => {
      m.emissive.set('#ffba66')
      m.emissiveIntensity = 1.65
    })
    h.sconceMats.forEach((m) => {
      m.emissive.set('#ffd08a')
      m.emissiveIntensity = 2.2
    })
  } else {
    h.hemi.color.set('#3a5078')
    h.hemi.groundColor.set('#141c24')
    h.hemi.intensity = 0.55
    h.sun.color.set('#9ab8eb')
    h.sun.intensity = 0.85
    h.sun.position.set(10, 18, -8)
    h.porchLight.intensity = 12
    h.renderer.toneMappingExposure = 0.95
    h.glassMats.forEach((m) => {
      m.emissive.set('#ffb454')
      m.emissiveIntensity = 2.2
    })
    h.sconceMats.forEach((m) => {
      m.emissive.set('#ffd492')
      m.emissiveIntensity = 2.6
    })
  }
}
