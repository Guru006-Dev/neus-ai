// The laptop's physical layout: pure data and functions, shared by Laptop.tsx and its tests.
// Scale: 1 unit ≈ 10.7 cm. The base is a 30 × 21 cm, ~1 cm thin unbranded aluminium laptop on the desk top (y = 0).
import { lidOpen, smoothstep } from '../timeline'
import { LID_CLOSED, LID_OPEN, LID_ORIGIN } from './constants'

export const BASE = {
  width: 2.8,
  depth: 2.0,
  /** Rear edge, just behind the hinge. */
  backZ: -1.05,
  frontZ: 0.95,
  bottom: 0,
  backHeight: 0.095,
  /** The base tapers slightly toward the front edge. */
  frontHeight: 0.08,
  cornerRadius: 0.13,
} as const

/** Lid in its own frame: x across, y up from the hinge axis, the display face at z = 0, the back at -thickness. */
export const LID = {
  width: 2.8,
  bottom: 0.03,
  top: 1.95,
  thickness: 0.045,
  cornerRadius: 0.11,
  /** The black glass inset from the lid's edge, leaving a hairline of aluminium. */
  bezelInset: 0.014,
} as const

/** Top of the (tapered) deck at depth z. */
export function baseTopAt(z: number): number {
  const t = Math.min(1, Math.max(0, (z - BASE.backZ) / (BASE.frontZ - BASE.backZ)))
  return BASE.backHeight + (BASE.frontHeight - BASE.backHeight) * t
}

/** Lid rotation about the hinge at progress p: closed until 0.015, open by 0.04 (the existing lidOpen timing). */
export const lidRotation = (p: number): number => LID_CLOSED + (LID_OPEN - LID_CLOSED) * smoothstep(lidOpen(p))

/** World positions of the lid's eight outer corners at a given rotation. */
export function lidCorners(angle: number): [number, number, number][] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const out: [number, number, number][] = []
  for (const x of [-LID.width / 2, LID.width / 2]) {
    for (const y of [LID.bottom, LID.top]) {
      for (const z of [-LID.thickness, 0]) {
        out.push([x + LID_ORIGIN[0], y * c - z * s + LID_ORIGIN[1], y * s + z * c + LID_ORIGIN[2]])
      }
    }
  }
  return out
}

export const TRACKPAD = { z: 0.53, width: 1.16, depth: 0.74, radius: 0.06 } as const

export interface KeySpec {
  x: number
  z: number
  w: number
  d: number
  /** Height of the key top. */
  top: number
}

const KEYBOARD = { width: 2.42, backZ: -0.88, unitGap: 0.022, keyHeight: 0.006, inset: 0.003 } as const

/** Row widths in key units; every row sums to 14.5. The top row is a half-height function row. */
const ROWS: readonly { keys: readonly number[]; height: number }[] = [
  { keys: Array(14).fill(14.5 / 14), height: 0.6 },
  { keys: [...Array(13).fill(1), 1.5], height: 1 },
  { keys: [1.5, ...Array(13).fill(1)], height: 1 },
  { keys: [1.8, ...Array(11).fill(1), 1.7], height: 1 },
  { keys: [2.3, ...Array(10).fill(1), 2.2], height: 1 },
  { keys: [1, 1, 1, 1.25, 5, 1.25, 1, 1, 1, 1], height: 1 },
]

const UNIT = KEYBOARD.width / 14.5

/** Every key, laid out row by row: one instanced mesh draws them all. */
export const KEYS: readonly KeySpec[] = (() => {
  const keys: KeySpec[] = []
  let z = KEYBOARD.backZ
  for (const row of ROWS) {
    const d = row.height * UNIT
    let x = -KEYBOARD.width / 2
    for (const w of row.keys) {
      const cz = z + d / 2
      keys.push({
        x: x + (w * UNIT) / 2,
        z: cz,
        w: w * UNIT - KEYBOARD.unitGap,
        d: d - KEYBOARD.unitGap,
        top: baseTopAt(cz) - KEYBOARD.inset + KEYBOARD.keyHeight,
      })
      x += w * UNIT
    }
    z += d
  }
  return keys
})()

/** Recessed keyboard well behind the keys. */
export const KEYBOARD_WELL = (() => {
  const minZ = KEYBOARD.backZ - 0.03
  const maxZ = Math.max(...KEYS.map((k) => k.z + k.d / 2)) + 0.03
  return { width: KEYBOARD.width + 0.06, minZ, maxZ, depth: maxZ - minZ, z: (minZ + maxZ) / 2 }
})()
