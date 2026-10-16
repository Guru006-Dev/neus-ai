import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { MARK_STROKE, N_NODES, N_POINTS, NODE_HOLE_RADIUS, NODE_RADIUS } from '../brand'
import { registerReporter } from '../debug'
import { clamp01, convergeStages, smoothstep } from '../timeline'
import { MARK_SCALE, markPoint } from './constants'

const Y_AXIS = new THREE.Vector3(0, 1, 0)
const STROKE_RADIUS = (MARK_STROKE * MARK_SCALE) / 2
/** Initial stroke radius as a fraction of the final one: about the width of a connection line. */
const STROKE_START = 0.12

/** Flat, unlit material drawn over the scene: the mark reads as the 2D brand mark, never clipped. */
function flatMaterial(color: string) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false })
}

/**
 * The NEXUS "N" the agent network converges into. Same geometry as the brand mark:
 * a round-capped, round-joined stroke through N_POINTS, and two nodes with a background-colored hole.
 */
export function NexusMark({ progressRef }: { progressRef: RefObject<number> }) {
  const strokeGroup = useRef<THREE.Group>(null)
  const nodeRefs = useRef<(THREE.Group | null)[]>([])
  const segmentRefs = useRef<(THREE.Mesh | null)[]>([])
  const capRefs = useRef<(THREE.Mesh | null)[]>([])
  const values = useRef({ stroke: 0, thickness: 0, nodes: 0 })

  const materials = useMemo(
    () => ({ stroke: flatMaterial('#e1e5e5'), node: flatMaterial('#e1e5e5'), hole: flatMaterial('#080808') }),
    [],
  )
  const points = useMemo(() => N_POINTS.map(([x, y]) => markPoint(x, y)), [])
  const segments = useMemo(
    () =>
      points.slice(1).map((end, i) => {
        const start = points[i]
        const dir = end.clone().sub(start)
        return {
          key: `seg-${i}`,
          length: dir.length(),
          mid: start.clone().add(end).multiplyScalar(0.5),
          quat: new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.normalize()),
        }
      }),
    [points],
  )
  const nodes = useMemo(() => N_NODES.map(([x, y]) => markPoint(x, y)), [])

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials])

  useFrame(() => {
    const { thicken, nodes: nodeScale } = convergeStages(progressRef.current)
    // The stroke starts at the connection lines' width and thickens into the brand mark's weight.
    const reveal = smoothstep(clamp01(thicken / 0.3))
    const thickness = STROKE_START + (1 - STROKE_START) * thicken
    materials.stroke.opacity = reveal
    if (strokeGroup.current) strokeGroup.current.visible = thicken > 0
    for (const seg of segmentRefs.current) seg?.scale.set(thickness, 1, thickness)
    for (const cap of capRefs.current) cap?.scale.setScalar(thickness)
    materials.node.opacity = nodeScale
    materials.hole.opacity = nodeScale
    // Scale each node in its own group so it grows in place.
    for (const node of nodeRefs.current) {
      if (!node) continue
      node.scale.setScalar(Math.max(nodeScale, 1e-4))
      node.visible = nodeScale > 0
    }
    values.current = { stroke: reveal, thickness: thicken > 0 ? thickness : 0, nodes: nodeScale }
  })

  useEffect(() => registerReporter('mark', () => ({ ...values.current })), [])

  return (
    <group>
      <group ref={strokeGroup} visible={false}>
        {segments.map((s, i) => (
          <mesh
            key={s.key}
            ref={(el) => {
              segmentRefs.current[i] = el
            }}
            position={s.mid}
            quaternion={s.quat}
            material={materials.stroke}
            renderOrder={10}
          >
            <cylinderGeometry args={[STROKE_RADIUS, STROKE_RADIUS, s.length, 24, 1, true]} />
          </mesh>
        ))}
        {points.map((pt, i) => (
          <mesh
            key={`cap-${pt.x}-${pt.y}`}
            ref={(el) => {
              capRefs.current[i] = el
            }}
            position={pt}
            material={materials.stroke}
            renderOrder={10}
          >
            <sphereGeometry args={[STROKE_RADIUS, 24, 12]} />
          </mesh>
        ))}
      </group>
      {nodes.map((n, i) => (
        <group
          key={`node-${n.x}-${n.y}`}
          position={n}
          visible={false}
          ref={(el) => {
            nodeRefs.current[i] = el
          }}
        >
          <mesh material={materials.node} renderOrder={11}>
            <circleGeometry args={[NODE_RADIUS * MARK_SCALE, 48]} />
          </mesh>
          <mesh material={materials.hole} renderOrder={12}>
            <circleGeometry args={[NODE_HOLE_RADIUS * MARK_SCALE, 48]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
