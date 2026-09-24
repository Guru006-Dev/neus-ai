import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import type { ScreenFrame } from '../timeline'
import { CameraRig } from './CameraRig'
import { Laptop } from './Laptop'

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
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <directionalLight position={[-2, 3, -5]} intensity={1.6} color="#c9d4dc" />
        <Laptop progressRef={progressRef} frame={frame} portal={overlayRef} />
      </Canvas>
    </div>
  )
}
