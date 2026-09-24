import * as THREE from 'three'

type Tuple3 = [number, number, number]

export const LID_ORIGIN: Tuple3 = [0, 0.1, -1]
export const LID_CLOSED = Math.PI / 2
export const LID_OPEN = -0.2

export const SCREEN_W = 2.6
export const SCREEN_H = 1.625
export const SCREEN_CENTER_Y = 1.02
export const SCREEN_PX_W = 1280
export const SCREEN_PX_H = 800
/** drei <Html transform>: one CSS px = distanceFactor / 400 world units. */
export const SCREEN_DISTANCE_FACTOR = (SCREEN_W * 400) / SCREEN_PX_W

export const TAG_POSITIONS: Tuple3[] = [
  [-2, 1.7, -0.3],
  [-2.25, 0.8, 0.2],
  [-1.85, -0.1, 0.7],
  [1.85, -0.1, 0.7],
  [2.25, 0.8, 0.2],
  [2, 1.7, -0.3],
]

/** Where each agent's line leaves the screen, as [x, y] in lid-local units. */
export const LINE_STARTS: readonly (readonly [number, number])[] = [
  [-1.2, 1.6],
  [-1.3, 1.02],
  [-1.2, 0.45],
  [1.2, 0.45],
  [1.3, 1.02],
  [1.2, 1.6],
]

/** In front of the laptop (base front edge is z ≈ 1.05) so nothing intersects the mark. */
export const MARK_CENTER: Tuple3 = [0, 1.1, 1.3]
/** World units per unit of the 40×40 brand box (40 → 1.6): sits over the screen without crowding the frame. */
export const MARK_SCALE = 0.04

const X_AXIS = new THREE.Vector3(1, 0, 0)

/** World position of a point on the open screen. */
export function screenPoint(x: number, y: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, 0.02).applyAxisAngle(X_AXIS, LID_OPEN).add(new THREE.Vector3(...LID_ORIGIN))
}

/** World position of a point in the 40×40 brand box (y points down). */
export function markPoint(bx: number, by: number): THREE.Vector3 {
  return new THREE.Vector3(
    MARK_CENTER[0] + (bx - 20) * MARK_SCALE,
    MARK_CENTER[1] - (by - 20) * MARK_SCALE,
    MARK_CENTER[2],
  )
}
