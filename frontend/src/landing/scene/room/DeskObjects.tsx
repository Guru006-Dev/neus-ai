import type { RoomMaterials } from './materials'
import { DESK_STACK, MUG, NOTEBOOK, PEN_HOLDER } from './layout'

/** The few things a student keeps on the desk: pens, a mug, a notebook, a couple of books. */
export function DeskObjects({ m }: { m: RoomMaterials }) {
  const [hx, , hz] = PEN_HOLDER.at
  const [mx, , mz] = MUG.at
  const [nx, , nz] = NOTEBOOK.at
  const [sx, , sz] = DESK_STACK.at
  let stackY = 0
  return (
    <group>
      <mesh position={[hx, PEN_HOLDER.height / 2, hz]} material={m.holder}>
        <cylinderGeometry args={[PEN_HOLDER.radius, PEN_HOLDER.radius * 0.94, PEN_HOLDER.height, 20, 1, true]} />
      </mesh>
      {[
        [0.07, 0.1, 0.12],
        [-0.06, -0.12, -0.05],
        [0.09, -0.02, 0.2],
      ].map(([dx, dz, tilt]) => (
        <mesh
          key={`${dx},${dz}`}
          position={[hx + dx, 0.75, hz + dz]}
          rotation={[tilt, 0, -tilt * 0.7]}
          material={tilt > 0.15 ? m.cover : m.metal}
        >
          <cylinderGeometry args={[0.035, 0.035, 1.45, 6]} />
        </mesh>
      ))}

      <mesh position={[mx, MUG.height / 2, mz]} material={m.ceramic}>
        <cylinderGeometry args={[MUG.radius, MUG.radius * 0.92, MUG.height, 24]} />
      </mesh>
      <mesh position={[mx - MUG.radius, MUG.height * 0.52, mz]} rotation={[0, 0, Math.PI / 2]} material={m.ceramic}>
        <torusGeometry args={[0.2, 0.045, 8, 16, Math.PI]} />
      </mesh>
      <mesh position={[mx, 0.004, mz]} rotation={[-Math.PI / 2, 0, 0]} material={m.contact}>
        <planeGeometry args={[1.2, 1.2]} />
      </mesh>

      <group position={[nx, 0, nz]} rotation={[0, NOTEBOOK.angle, 0]}>
        <mesh position={[0, NOTEBOOK.thickness / 2, 0]} material={m.cover}>
          <boxGeometry args={[NOTEBOOK.width, NOTEBOOK.thickness, NOTEBOOK.depth]} />
        </mesh>
        <mesh position={[0.04, NOTEBOOK.thickness + 0.004, 0]} material={m.paper}>
          <boxGeometry args={[NOTEBOOK.width - 0.14, 0.008, NOTEBOOK.depth - 0.12]} />
        </mesh>
        <mesh position={[0.25, NOTEBOOK.thickness + 0.05, 0.1]} rotation={[Math.PI / 2, 0, 0.5]} material={m.metal}>
          <cylinderGeometry args={[0.035, 0.035, 1.35, 6]} />
        </mesh>
      </group>

      {DESK_STACK.heights.map((h, i) => {
        const y = stackY + h / 2
        stackY += h
        return (
          <mesh key={h} position={[sx + (i - 1) * 0.06, y, sz + (1 - i) * 0.05]} rotation={[0, (i - 1) * 0.08, 0]} material={i === 1 ? m.cover : m.shelf}>
            <boxGeometry args={[DESK_STACK.width - i * 0.1, h, DESK_STACK.depth - i * 0.08]} />
          </mesh>
        )
      })}
    </group>
  )
}
