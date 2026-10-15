import type { RoomMaterials } from './materials'
import { SIDE_WALL_X, WALL_Z, WINDOW } from './layout'

/** Back wall, the side wall that makes the corner, and one narrow window with a dark exterior. */
export function RoomShell({ m }: { m: RoomMaterials }) {
  const w = WINDOW
  const cx = (w.minX + w.maxX) / 2
  const cy = (w.minY + w.maxY) / 2
  const width = w.maxX - w.minX
  const height = w.maxY - w.minY
  const z = WALL_Z + 0.06
  return (
    <group>
      <mesh position={[4, 2, WALL_Z]} material={m.wall}>
        <planeGeometry args={[34, 24]} />
      </mesh>
      <mesh position={[SIDE_WALL_X, 2, WALL_Z + 8]} rotation={[0, Math.PI / 2, 0]} material={m.wall}>
        <planeGeometry args={[16, 24]} />
      </mesh>

      <mesh position={[cx, cy, WALL_Z + 0.01]} material={m.glass}>
        <planeGeometry args={[width, height]} />
      </mesh>
      {[
        { pos: [cx, w.maxY, z], size: [width + w.frame, w.frame, 0.14] },
        { pos: [cx, w.minY, z + 0.04], size: [width + w.frame * 2.4, w.frame * 1.3, 0.34] },
        { pos: [w.minX, cy, z], size: [w.frame, height, 0.14] },
        { pos: [w.maxX, cy, z], size: [w.frame, height, 0.14] },
        { pos: [cx, cy + 0.6, z], size: [width, w.frame * 0.6, 0.08] },
      ].map(({ pos, size }) => (
        <mesh key={pos.join(',')} position={pos as [number, number, number]} material={m.frame}>
          <boxGeometry args={size as [number, number, number]} />
        </mesh>
      ))}
    </group>
  )
}
