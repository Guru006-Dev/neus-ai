import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import type * as THREE from 'three'
import { registerReporter } from '../../debug'
import { deskSpill, lampLevel, roomPresence } from '../../timeline'
import { DeskObjects } from './DeskObjects'
import { applyPresence, useRoomMaterials } from './materials'
import { RoomShell } from './RoomShell'
import { StudyDesk } from './StudyDesk'
import { StudyLamp } from './StudyLamp'
import { StudyShelves } from './StudyShelves'

const LAMP_INTENSITY = 5
const SPILL_INTENSITY = 3.2

/**
 * A late-night student study corner around the laptop. Everything is static except light and exposure,
 * which are pure functions of scroll progress: the room is present at the start and recedes as NEXUS takes over.
 */
export function StudyRoomEnvironment({ progressRef }: { progressRef: RefObject<number> }) {
  const m = useRoomMaterials()
  const lamp = useRef<THREE.PointLight>(null)
  const spill = useRef<THREE.PointLight>(null)
  const last = useRef({ presence: -1, lamp: -1, spill: -1 })

  useFrame(() => {
    const p = progressRef.current
    const presence = roomPresence(p)
    const lampValue = lampLevel(p)
    const spillValue = deskSpill(p)
    if (presence !== last.current.presence) applyPresence(m, presence)
    if (lamp.current) lamp.current.intensity = LAMP_INTENSITY * lampValue
    if (spill.current) spill.current.intensity = SPILL_INTENSITY * spillValue
    m.bulb.color.setRGB(1, 0.86 * (0.6 + 0.4 * lampValue), 0.68 * (0.5 + 0.5 * lampValue))
    last.current = { presence, lamp: lampValue, spill: spillValue }
  })

  useEffect(() => registerReporter('room', () => ({ ...last.current })), [])

  return (
    <group>
      <RoomShell m={m} />
      <StudyDesk m={m} />
      <StudyShelves m={m} />
      <StudyLamp ref={lamp} m={m} />
      <DeskObjects m={m} />
      <pointLight ref={spill} position={[0, 0.55, 1.35]} color="#cfdcea" intensity={0} distance={6} decay={2} />
    </group>
  )
}
