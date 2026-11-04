'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Просмотр GLB-модели «Тип 5» из Kimi 3D Make перед интеграцией: тот же свет, что на сайте,
 * орбитальная камера, счётчик draw calls и кнопка сброса вида.
 */
export default function GlbHousePreview() {
  const host = useRef<HTMLDivElement>(null)
  const info = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = 1.0
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#efe9da', 60, 160)
    const camera = new THREE.PerspectiveCamera(35, el.clientWidth / el.clientHeight, 0.1, 400)
    const homePos = new THREE.Vector3(16, 10, 18)
    camera.position.copy(homePos)

    scene.add(new THREE.HemisphereLight('#f2f6ff', '#b6ad93', 0.95))
    const sun = new THREE.DirectionalLight('#fff1dc', 1.9)
    sun.position.set(-14, 24, 12)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.02
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 100 })
    scene.add(sun)

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ opacity: 0.15 }))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 2, 0)
    controls.maxPolarAngle = Math.PI / 2.05
    controls.enableDamping = true
    controls.update()

    let model: THREE.Object3D | null = null
    let tris = 0
    new GLTFLoader().load('/models/khoroshiy-dom-type5.glb', (gltf) => {
      model = gltf.scene
      model.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) {
          m.castShadow = true
          m.receiveShadow = true
          tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3
          const mat = m.material as THREE.MeshStandardMaterial
          if (mat.map) mat.map.anisotropy = 8
        }
      })
      scene.add(model)
      if (info.current) info.current.textContent = `GLB загружен · ${Math.round(tris).toLocaleString('ru')} треугольников`
    })

    const loop = () => {
      raf = requestAnimationFrame(loop)
      controls.update()
      renderer.render(scene, camera)
      if (info.current && model) {
        const c = renderer.info.render.calls
        info.current.textContent = info.current.textContent?.replace(/· \d+ draw calls$/, '') + ` · ${c} draw calls`
      }
    }
    let raf = requestAnimationFrame(loop)

    const reset = () => {
      camera.position.copy(homePos)
      controls.target.set(0, 2, 0)
      controls.update()
    }
    const btn = el.querySelector('button')
    btn?.addEventListener('click', reset)

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      const mats = new Set<THREE.Material>()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        ;(Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
          mats.add(x)
          const mm = x as THREE.MeshStandardMaterial
          mm.map?.dispose()
        })
      })
      mats.forEach((m) => m.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div className="glb-preview">
      <div ref={host} className="glb-preview__canvas">
        <button type="button" className="glb-preview__reset">
          Сбросить вид
        </button>
      </div>
      <div ref={info} className="glb-preview__info">
        Загрузка модели…
      </div>
    </div>
  )
}
