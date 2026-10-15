import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import type { RoomMaterials } from './materials'
import { LAMP, type V3 } from './layout'

const UP = new THREE.Vector3(0, 1, 0)

/** A cylinder spanning two points: the lamp's arms. */
function Rod({ from, to, radius, m }: { from: V3; to: V3; radius: number; m: THREE.Material }) {
  const { mid, quat, length } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      length: dir.length(),
    }
  }, [from, to])
  return (
    <mesh position={mid} quaternion={quat} material={m}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
    </mesh>
  )
}

/** An articulated study lamp. The warm practical light itself is owned (and dimmed) by the environment. */
export const StudyLamp = forwardRef<THREE.PointLight, { m: RoomMaterials }>(function StudyLamp({ m }, lightRef) {
  const shade = useMemo(() => {
    const head = new THREE.Vector3(...LAMP.head)
    const dir = new THREE.Vector3(...LAMP.aim).sub(head).normalize()
    return {
      quat: new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().negate()),
      center: head.clone().addScaledVector(dir, LAMP.shadeLength / 2),
      bulb: head.clone().addScaledVector(dir, LAMP.shadeLength * 0.45),
    }
  }, [])
  const base = new THREE.Vector3(...LAMP.base)
  return (
    <group>
      <mesh position={[base.x, 0.06, base.z]} material={m.metal}>
        <cylinderGeometry args={[LAMP.baseRadius, LAMP.baseRadius * 1.08, 0.12, 24]} />
      </mesh>
      <mesh position={[base.x, 0.004, base.z]} rotation={[-Math.PI / 2, 0, 0]} material={m.contact}>
        <planeGeometry args={[1.5, 1.5]} />
      </mesh>
      <Rod from={[base.x, 0.12, base.z]} to={LAMP.elbow} radius={0.045} m={m.metal} />
      <Rod from={LAMP.elbow} to={LAMP.head} radius={0.045} m={m.metal} />
      <mesh position={LAMP.elbow} material={m.metal}>
        <sphereGeometry args={[0.08, 12, 8]} />
      </mesh>
      <mesh position={shade.center} quaternion={shade.quat} material={m.metal}>
        <cylinderGeometry args={[LAMP.shadeRadius * 0.42, LAMP.shadeRadius, LAMP.shadeLength, 24, 1, true]} />
      </mesh>
      <mesh position={shade.bulb} material={m.bulb}>
        <sphereGeometry args={[0.09, 12, 8]} />
      </mesh>
      <pointLight ref={lightRef} position={shade.bulb} color="#ffc98f" intensity={0} distance={11} decay={2} />
    </group>
  )
})
