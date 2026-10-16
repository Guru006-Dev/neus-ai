import type { RoomMaterials } from './materials'
import { DESK, PEDESTAL } from './layout'

const W = DESK.maxX - DESK.minX
const D = DESK.frontZ - DESK.backZ
const CX = (DESK.minX + DESK.maxX) / 2
const CZ = (DESK.frontZ + DESK.backZ) / 2

/** A compact laminate student desk: top, side panel, drawer pedestal, and a baked shadow under the laptop. */
export function StudyDesk({ m }: { m: RoomMaterials }) {
  const pw = PEDESTAL.maxX - PEDESTAL.minX
  const pd = PEDESTAL.frontZ - PEDESTAL.backZ
  const ph = -DESK.thickness - DESK.floor
  const px = (PEDESTAL.minX + PEDESTAL.maxX) / 2
  const pz = (PEDESTAL.frontZ + PEDESTAL.backZ) / 2
  const py = DESK.floor + ph / 2
  const drawers = [-1.35, -3.55]
  return (
    <group>
      <mesh position={[CX, -DESK.thickness / 2, CZ]} material={m.desk} receiveShadow>
        <boxGeometry args={[W, DESK.thickness, D]} />
      </mesh>
      {/* front edge band: reads as the desk's thickness from a low camera */}
      <mesh position={[CX, -DESK.thickness / 2, DESK.frontZ + 0.006]} material={m.deskDark}>
        <boxGeometry args={[W, DESK.thickness * 0.5, 0.012]} />
      </mesh>
      <mesh position={[DESK.minX + 0.12, py, CZ]} material={m.deskDark}>
        <boxGeometry args={[0.24, ph, D - 0.3]} />
      </mesh>
      <mesh position={[px, py, pz]} material={m.deskDark}>
        <boxGeometry args={[pw, ph, pd]} />
      </mesh>
      {drawers.map((y) => (
        <group key={y}>
          <mesh position={[px, y, PEDESTAL.frontZ + 0.03]} material={m.shelf}>
            <boxGeometry args={[pw - 0.16, 1.9, 0.06]} />
          </mesh>
          <mesh position={[px, y + 0.55, PEDESTAL.frontZ + 0.1]} material={m.metal}>
            <boxGeometry args={[0.9, 0.07, 0.08]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.003, 0.05]} rotation={[-Math.PI / 2, 0, 0]} material={m.contact}>
        <planeGeometry args={[3.9, 2.9]} />
      </mesh>
    </group>
  )
}
