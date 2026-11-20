import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

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
  rim: THREE.DirectionalLight
  porchLight: THREE.PointLight
  pivot: THREE.Group
  glassMats: THREE.MeshStandardMaterial[]
  sconceMats: THREE.MeshStandardMaterial[]
  size: THREE.Vector3
}

/**
 * Студийная WebGL-сцена Three.js для 3D-дома (.glb):
 * — PMREM RoomEnvironment для живых отражений на стёклах и графитовой кровле;
 * — трёхточечный архитектурный свет (тёплое солнце + небесная полусфера + мягкий контровой rim-light);
 * — мягкий туман краёв площадки на дневном фоне и тёплое свечение окон + крыльца вечером/ночью.
 */
export function createHouseScene(
  el: HTMLElement,
  opts: {
    modelUrl?: string
    studioFog?: boolean
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.85))
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  el.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  if (opts.studioFog) {
    scene.fog = new THREE.Fog('#ebe3d6', 42, 86)
  }

  // Студийная карта окружения (RoomEnvironment) — даёт объём кирпичу и живые блики стёклам и кровле
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  pmrem.dispose()

  const camera = new THREE.PerspectiveCamera(34, w / h, 0.15, 250)
  camera.position.set(0, 3.2, 24.5)

  const hemi = new THREE.HemisphereLight('#f6faff', '#cfc2ae', 1.05)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight('#fff2da', 2.35)
  sun.position.set(16, 24, 18)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.bias = -0.0005
  sun.shadow.normalBias = 0.025
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, far: 80 })
  scene.add(sun)

  // Мягкий контровой свет с противоположной стороны — подчёркивает грани кровли и кирпичной кладки
  const rim = new THREE.DirectionalLight('#d7e8ff', 0.65)
  rim.position.set(-18, 12, -14)
  scene.add(rim)

  const porchLight = new THREE.PointLight('#ffaa55', 0, 16, 1.5)
  porchLight.position.set(TYPE5_DOOR.x, 2.55, TYPE5_DOOR.z + 0.5)
  scene.add(porchLight)

  // Контактная мягкая тень на земле под домом
  const ground = new THREE.Mesh(new THREE.CircleGeometry(24, 48), new THREE.ShadowMaterial({ opacity: 0.16 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.01
  ground.receiveShadow = true
  scene.add(ground)

  const pivot = new THREE.Group()
  scene.add(pivot)

  const glassMats: THREE.MeshStandardMaterial[] = []
  const sconceMats: THREE.MeshStandardMaterial[] = []
  const size = new THREE.Vector3(15.6, 6.6, 15.6)
  const handles: HouseSceneHandles = { renderer, scene, camera, hemi, sun, rim, porchLight, pivot, glassMats, sconceMats, size }

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
            std.envMapIntensity = 1.45
            std.roughness = Math.min(std.roughness ?? 0.25, 0.18)
            if (!glassMats.includes(std)) glassMats.push(std)
          } else if (nm.includes('roof') || nm.includes('trim')) {
            std.envMapIntensity = 0.85
          } else if (nm.includes('sconce') || nm.includes('lens')) {
            if (!sconceMats.includes(std)) sconceMats.push(std)
          } else {
            std.envMapIntensity = 0.55
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
    envTex.dispose()
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
    h.hemi.color.set('#f6faff')
    h.hemi.groundColor.set('#cfc2ae')
    h.hemi.intensity = 1.05
    h.sun.color.set('#fff2da')
    h.sun.intensity = 2.35
    h.sun.position.set(16, 24, 18)
    h.rim.color.set('#d7e8ff')
    h.rim.intensity = 0.65
    h.porchLight.intensity = 0
    h.renderer.toneMappingExposure = 1.12
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
    h.hemi.intensity = 0.68
    h.sun.color.set('#ffae6c')
    h.sun.intensity = 1.6
    h.sun.position.set(-18, 7.5, 14)
    h.rim.color.set('#7a8ec2')
    h.rim.intensity = 0.45
    h.porchLight.intensity = 8.5
    h.renderer.toneMappingExposure = 1.04
    h.glassMats.forEach((m) => {
      m.emissive.set('#ffba66')
      m.emissiveIntensity = 1.75
    })
    h.sconceMats.forEach((m) => {
      m.emissive.set('#ffd08a')
      m.emissiveIntensity = 2.4
    })
  } else {
    h.hemi.color.set('#3a5078')
    h.hemi.groundColor.set('#141c24')
    h.hemi.intensity = 0.48
    h.sun.color.set('#9ab8eb')
    h.sun.intensity = 0.82
    h.sun.position.set(10, 18, -8)
    h.rim.color.set('#6989c9')
    h.rim.intensity = 0.55
    h.porchLight.intensity = 14
    h.renderer.toneMappingExposure = 0.98
    h.glassMats.forEach((m) => {
      m.emissive.set('#ffb454')
      m.emissiveIntensity = 2.4
    })
    h.sconceMats.forEach((m) => {
      m.emissive.set('#ffd492')
      m.emissiveIntensity = 2.8
    })
  }
}
