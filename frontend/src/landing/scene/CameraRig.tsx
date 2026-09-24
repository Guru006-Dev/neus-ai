import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, type RefObject } from 'react'
import { registerReporter } from '../debug'
import { cameraAt } from '../timeline'

export function CameraRig({ progressRef }: { progressRef: RefObject<number> }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useFrame(() => {
    const { position, target } = cameraAt(progressRef.current, size.width / Math.max(1, size.height))
    camera.position.set(position[0], position[1], position[2])
    camera.lookAt(target[0], target[1], target[2])
    camera.updateMatrixWorld()
  })

  useEffect(
    () =>
      registerReporter('camera', () => ({
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
      })),
    [camera],
  )

  return null
}
