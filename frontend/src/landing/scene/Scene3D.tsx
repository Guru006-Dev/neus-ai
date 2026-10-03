import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import type * as THREE from 'three'
import { convergeStages, lidOpen, type ScreenFrame } from '../timeline'
import { CameraRig } from './CameraRig'
import { AgentNetwork } from './AgentNetwork'
import { Laptop } from './Laptop'
import { NexusMark } from './NexusMark'

export interface SceneProps {
  progressRef: RefObject<number>
  invalidateRef: RefObject<() => void>
  frame: ScreenFrame
}

/** Hands R3F's invalidate() to the scroll driver so frames render only when progress changes. */
function InvalidateBridge({ invalidateRef }: Pick<SceneProps, 'invalidateRef'>) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    invalidateRef.current = () => invalidate()
    invalidate()
    return () => {
      invalidateRef.current = () => {}
    }
  }, [invalidate, invalidateRef])
  return null
}

const LIGHTS = { ambient: 0.35, key: 1.1, back: 1.6, rim: 1.4 }

/** Lights dim as the network converges so the N becomes the only subject; a rim light catches the closed lid. */
function SceneLights({ progressRef }: Pick<SceneProps, 'progressRef'>) {
  const ambient = useRef<THREE.AmbientLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const back = useRef<THREE.DirectionalLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)
  useFrame(() => {
    const p = progressRef.current
    const dim = convergeStages(p).laptop
    if (ambient.current) ambient.current.intensity = LIGHTS.ambient * dim
    if (key.current) key.current.intensity = LIGHTS.key * dim
    if (back.current) back.current.intensity = LIGHTS.back * dim
    if (rim.current) rim.current.intensity = LIGHTS.rim * (1 - lidOpen(p))
  })
  return (
    <>
      <ambientLight ref={ambient} intensity={LIGHTS.ambient} />
      <directionalLight ref={key} position={[3, 5, 4]} intensity={LIGHTS.key} />
      <directionalLight ref={back} position={[-2, 3, -5]} intensity={LIGHTS.back} color="#c9d4dc" />
      <directionalLight ref={rim} position={[0, 1.2, -6]} intensity={LIGHTS.rim} color="#dfe6ea" />
    </>
  )
}

export default function Scene3D({ progressRef, invalidateRef, frame }: SceneProps) {
  // Stable mount point for drei <Html>. Its default target (events.connected) changes after the
  // first mount, which leaves the re-created HTML root empty.
  const overlayRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={overlayRef} className="scene" aria-hidden="true">
      <Canvas
        frameloop="demand"
        flat
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 40, near: 0.1, far: 60, position: [0, 1.6, 7.5] }}
      >
        <InvalidateBridge invalidateRef={invalidateRef} />
        <CameraRig progressRef={progressRef} />
        <SceneLights progressRef={progressRef} />
        <Laptop progressRef={progressRef} frame={frame} portal={overlayRef} />
        <AgentNetwork progressRef={progressRef} portal={overlayRef} />
        <NexusMark progressRef={progressRef} />
      </Canvas>
    </div>
  )
}
