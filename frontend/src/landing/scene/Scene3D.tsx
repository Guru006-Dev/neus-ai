import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { convergeStages, lidOpen, type ScreenFrame } from '../timeline'
import { CameraRig } from './CameraRig'
import { AgentNetwork } from './AgentNetwork'
import { Laptop } from './Laptop'
import { lidRotation } from './laptop-layout'
import { NexusMark } from './NexusMark'
import { StudyRoomEnvironment } from './room/StudyRoomEnvironment'

export interface SceneProps {
  progressRef: RefObject<number>
  invalidateRef: RefObject<() => void>
  /** Progress of the last rendered frame, for the test hook's settle check. */
  renderedRef: RefObject<number | null>
  frame: ScreenFrame
}

/** Hands R3F's invalidate() to the scroll driver so frames render only when progress changes. */
function InvalidateBridge({ invalidateRef, renderedRef, progressRef }: Pick<SceneProps, 'invalidateRef' | 'renderedRef' | 'progressRef'>) {
  const invalidate = useThree((s) => s.invalidate)
  useFrame(() => {
    renderedRef.current = progressRef.current
  })
  useEffect(
    () => () => {
      renderedRef.current = null
    },
    [renderedRef],
  )
  useEffect(() => {
    invalidateRef.current = () => invalidate()
    invalidate()
    return () => {
      invalidateRef.current = () => {}
    }
  }, [invalidate, invalidateRef])
  return null
}

/**
 * AgX tone mapping. Unlit UI (screen surface, network lines, the mark, the bulb) opts out via toneMapped: false.
 * Exposure opens up as the scene dims toward the N, like a camera adapting, so the dark room keeps its shadow
 * detail instead of crushing to black. It is a pure function of the same dim value as the lights.
 */
const TONE_EXPOSURE = 0.95
const TONE_EXPOSURE_DARK = 2.1
/** convergeStages().laptop at the end of the sequence: the darkest the scene lights get. */
const DIM_FLOOR = 0.35

const LIGHTS = { ambient: 1.7, key: 1.1, back: 1.6, rim: 1.4 }

/**
 * Lights dim as the network converges so the N becomes the only subject; a rim light catches the closed lid.
 * The key light is the scene's only shadow caster, its frustum fitted to the desk around the laptop.
 */
function SceneLights({ progressRef }: Pick<SceneProps, 'progressRef'>) {
  const gl = useThree((s) => s.gl)
  const ambient = useRef<THREE.AmbientLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const back = useRef<THREE.DirectionalLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)
  const shadowLid = useRef<number | null>(null)
  useEffect(() => {
    // The shadow map depends only on the light and the casters, not the camera: re-render it when the lid moves.
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
  }, [gl])
  useFrame(() => {
    const p = progressRef.current
    const lid = lidRotation(p)
    if (lid !== shadowLid.current) {
      shadowLid.current = lid
      gl.shadowMap.needsUpdate = true
    }
    const dim = convergeStages(p).laptop
    if (ambient.current) ambient.current.intensity = LIGHTS.ambient * dim
    if (key.current) key.current.intensity = LIGHTS.key * dim
    if (back.current) back.current.intensity = LIGHTS.back * dim
    if (rim.current) rim.current.intensity = LIGHTS.rim * (1 - lidOpen(p))
    const dark = Math.min(1, Math.max(0, (1 - dim) / (1 - DIM_FLOOR)))
    gl.toneMappingExposure = TONE_EXPOSURE + (TONE_EXPOSURE_DARK - TONE_EXPOSURE) * dark
  })
  return (
    <>
      <ambientLight ref={ambient} intensity={LIGHTS.ambient} />
      <directionalLight
        ref={key}
        position={[3, 5, 4]}
        intensity={LIGHTS.key}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4.2}
        shadow-camera-right={4.2}
        shadow-camera-top={3.4}
        shadow-camera-bottom={-3.4}
        shadow-camera-near={2}
        shadow-camera-far={14}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight ref={back} position={[-2, 3, -5]} intensity={LIGHTS.back} color="#c9d4dc" />
      <directionalLight ref={rim} position={[0, 1.2, -6]} intensity={LIGHTS.rim} color="#dfe6ea" />
    </>
  )
}

export default function Scene3D({ progressRef, invalidateRef, renderedRef, frame }: SceneProps) {
  // Stable mount point for drei <Html>. Its default target (events.connected) changes after the
  // first mount, which leaves the re-created HTML root empty.
  const overlayRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={overlayRef} className="scene" aria-hidden="true">
      <Canvas
        frameloop="demand"
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: TONE_EXPOSURE }}
        camera={{ fov: 40, near: 0.1, far: 60, position: [0, 1.6, 7.5] }}
      >
        <InvalidateBridge invalidateRef={invalidateRef} renderedRef={renderedRef} progressRef={progressRef} />
        <CameraRig progressRef={progressRef} />
        <SceneLights progressRef={progressRef} />
        <StudyRoomEnvironment progressRef={progressRef} />
        <Laptop progressRef={progressRef} frame={frame} portal={overlayRef} />
        <AgentNetwork progressRef={progressRef} portal={overlayRef} />
        <NexusMark progressRef={progressRef} />
      </Canvas>
    </div>
  )
}
