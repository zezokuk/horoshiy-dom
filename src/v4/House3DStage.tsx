'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { applyHouseLighting, createHouseScene, type DayTime, type HouseSceneHandles } from '@/v4/threeModel'

type ViewMode = '3d' | 'photo' | 'pano360'

const PANO_STOPS = [
  { id: 'porch', label: 'Крыльцо', src: '/v4/img/in-porch.webp', note: 'Крыльцо под навесом, входная дверь в светлую прихожую' },
  { id: 'hall', label: 'Прихожая', src: '/v4/img/in-hall.webp', note: 'Встроенные шкафы, выход в кухню-гостиную и спальни' },
  { id: 'kitchen', label: 'Кухня-гостиная · 27,2 м²', src: '/v4/img/in-kitchen.webp', note: 'Единое светлое пространство с выходом на террасу' },
  { id: 'terrace', label: 'Терраса · 19 м²', src: '/v4/img/in-terrace.webp', note: 'Собственная терраса и газон без соседей за стенкой' },
]

const DAY_LABELS: { id: DayTime; label: string }[] = [
  { id: 'day', label: 'день' },
  { id: 'evening', label: 'вечер · горят окна' },
  { id: 'night', label: 'ночь · луна' },
]

const STILL_BY_TIME: Record<DayTime, string> = {
  day: '/v4/img/type5-day.webp',
  evening: '/v4/img/type5-evening.webp',
  night: '/v4/img/type5-night.webp',
}

/**
 * Верхний медиа-блок страницы дома и участка (/v4/dom/[code], по Figma 278-1609 / 278-1430):
 * - По умолчанию сразу открыта интерактивная 3D-модель дома, которую можно крутить мышью или пальцем
 * - Переключение времени суток: день / вечер · горят окна / ночь · луна
 * - Встроенный 360° панорамный просмотрщик по комнатам
 * - Переход «Снять крышу → вид сверху с мебелью»
 */
export function House3DStage({
  title,
  photo,
  hasPlanRender,
  isType5,
}: {
  title: string
  photo?: string
  hasPlanRender: boolean
  isType5: boolean
}) {
  // На странице любого дома/участка сразу показываем интерактивную 3D-модель, которую можно крутить
  const [mode, setMode] = useState<ViewMode>('3d')
  const [dayTime, setDayTime] = useState<DayTime>('day')
  const [webglReady, setWebglReady] = useState(false)
  const [webglFailed, setWebglFailed] = useState(false)
  const [panoIdx, setPanoIdx] = useState(2)
  const [panoYaw, setPanoYaw] = useState(0)
  const dragRef = useRef<{ x: number; yaw: number } | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const handlesRef = useRef<HouseSceneHandles | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const homeCam = useRef({ pos: new THREE.Vector3(13.5, 5.4, 18.5), target: new THREE.Vector3(0, 2.0, 0) })

  useEffect(() => {
    if (mode !== '3d' || webglFailed) return
    const host = stageRef.current
    if (!host) return

    let raf = 0
    let inView = true
    let controls: OrbitControls | null = null
    const { handles, dispose } = createHouseScene(host, {
      onLoaded: (h) => {
        handlesRef.current = h
        setWebglReady(true)
        applyHouseLighting(h, dayTime)
      },
      onError: () => setWebglFailed(true),
    })
    if (!handles) return

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true
      },
      { threshold: 0 },
    )
    io.observe(host)

    handles.camera.position.copy(homeCam.current.pos)
    controls = new OrbitControls(handles.camera, handles.renderer.domElement)
    controls.target.copy(homeCam.current.target)
    controls.enableZoom = false
    controls.enablePan = false
    controls.maxPolarAngle = Math.PI / 2.04
    controls.minPolarAngle = 0.25
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.65
    controls.update()
    controlsRef.current = controls

    const stopSpin = () => {
      if (controls) controls.autoRotate = false
    }
    handles.renderer.domElement.addEventListener('pointerdown', stopSpin)

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!inView) return
      controls?.update()
      handles.renderer.render(handles.scene, handles.camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      handles.renderer.domElement.removeEventListener('pointerdown', stopSpin)
      controls?.dispose()
      controlsRef.current = null
      handlesRef.current = null
      dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dayTime обновляется отдельно без пересоздания WebGL
  }, [mode, webglFailed])

  useEffect(() => {
    if (handlesRef.current) applyHouseLighting(handlesRef.current, dayTime)
  }, [dayTime])

  const zoom = (factor: number) => {
    const h = handlesRef.current
    const c = controlsRef.current
    if (!h || !c) return
    const dir = h.camera.position.clone().sub(c.target)
    const len = dir.length()
    const next = Math.min(30, Math.max(9.5, len * factor))
    dir.setLength(next)
    h.camera.position.copy(c.target).add(dir)
    c.update()
  }

  const resetCam = () => {
    const h = handlesRef.current
    const c = controlsRef.current
    if (!h || !c) return
    h.camera.position.copy(homeCam.current.pos)
    c.target.copy(homeCam.current.target)
    c.autoRotate = false
    c.update()
  }

  const takeOffRoof = () => {
    const planEl = document.getElementById('plan')
    if (planEl) planEl.scrollIntoView({ behavior: 'smooth' })
  }

  const fallbackPhoto = isType5 ? STILL_BY_TIME[dayTime] : (photo ?? STILL_BY_TIME[dayTime])
  const curPano = PANO_STOPS[panoIdx]

  return (
    <div className={`v4-stage v4-stage--${dayTime}`}>
      <div className="v4-stage__media">
        {mode === '3d' && !webglFailed ? (
          <>
            <div className="v4-stage__sky" aria-hidden>
              {dayTime === 'night' && <i className="v4-stage__moon" />}
            </div>
            <div ref={stageRef} className="v4-stage__canvas" aria-label={`Интерактивная 3D-модель: ${title}`} />
            {!webglReady && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="v4-stage__poster" src={fallbackPhoto} alt={`${title} — загрузка 3D`} />
            )}
            <div className="v4-stage__3d-tools">
              <button type="button" onClick={() => zoom(0.84)} aria-label="Приблизить 3D">+</button>
              <button type="button" onClick={() => zoom(1.18)} aria-label="Отдалить 3D">−</button>
              <button type="button" onClick={resetCam} aria-label="Сбросить ракурс">Сброс</button>
            </div>
          </>
        ) : mode === 'pano360' ? (
          <div
            className="v4-pano"
            onPointerDown={(e) => {
              dragRef.current = { x: e.clientX, yaw: panoYaw }
              ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (!dragRef.current) return
              const dx = e.clientX - dragRef.current.x
              setPanoYaw(Math.max(-35, Math.min(35, dragRef.current.yaw + dx * 0.14)))
            }}
            onPointerUp={() => { dragRef.current = null }}
            onPointerCancel={() => { dragRef.current = null }}
            role="region"
            aria-label="Панорамный тур 360°"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={curPano.src}
              alt={`${curPano.label} — пример 360° панорамы`}
              style={{ transform: `scale(1.22) translateX(${panoYaw * 0.35}%)` }}
              draggable={false}
            />
            <div className="v4-pano__overlay">
              <div className="v4-pano__rooms">
                {PANO_STOPS.map((s, k) => (
                  <button key={s.id} type="button" aria-pressed={k === panoIdx} onClick={() => { setPanoIdx(k); setPanoYaw(0) }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="v4-pano__hint">Потяните вправо или влево, чтобы осмотреться · 360° тур внутри дома</p>
            </div>
          </div>
        ) : (
          <div className={`v4-stage__photo v4-stage__photo--${dayTime}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fallbackPhoto} alt={`${title}, изображение проекта`} fetchPriority="high" />
          </div>
        )}

        {/* Верхняя панель режимов */}
        <div className="v4-stage__top">
          <div className="v4-stage__modes" role="tablist" aria-label="Режим просмотра">
            <button type="button" role="tab" aria-selected={mode === '3d'} onClick={() => setMode('3d')}>
              3D-модель · крутить 360°
            </button>
            <button type="button" role="tab" aria-selected={mode === 'pano360'} onClick={() => setMode('pano360')}>
              360° внутри
            </button>
            {photo && (
              <button type="button" role="tab" aria-selected={mode === 'photo'} onClick={() => setMode('photo')}>
                Фото проекта
              </button>
            )}
          </div>
          {hasPlanRender && (
            <button type="button" className="v4-stage__roof-btn" onClick={takeOffRoof}>
              Снять крышу → вид сверху с мебелью
            </button>
          )}
        </div>

        {/* Нижняя левая панель переключения суток (как в Figma 278-1609) */}
        {mode !== 'pano360' && (
          <div className="v4-stage__daybar" role="group" aria-label="Время суток">
            {DAY_LABELS.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={dayTime === d.id}
                onClick={() => setDayTime(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        <p className="v4-stage__cap">
          {mode === '3d'
            ? isType5
              ? '3D-модель «Тип 5» · крутите мышью или пальцем'
              : `Интерактивная 3D-модель дома · крутите мышью или пальцем`
            : mode === 'pano360'
              ? curPano.note
              : 'Изображение проекта'}
        </p>
      </div>
    </div>
  )
}
