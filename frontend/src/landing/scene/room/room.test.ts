import { describe, expect, it } from 'vitest'
import {
  cameraAt,
  convergeStages,
  deskSpill,
  introVisibility,
  lampLevel,
  lidOpen,
  roomPresence,
  screenOn,
  sceneStateAt,
} from '../../timeline'
import { TAG_POSITIONS } from '../constants'
import { DESK, LAPTOP_VOLUME, ROOM_PROPS, type Box } from './layout'

const intersects = (a: Box, b: Box) =>
  a.min.every((v, i) => v < b.max[i]) && b.min.every((v, i) => v < a.max[i])

const grow = (b: Box, m: number): Box => ({ ...b, min: b.min.map((v) => v - m), max: b.max.map((v) => v + m) })

const inside = (pt: readonly number[], b: Box) => pt.every((v, i) => v > b.min[i] && v < b.max[i])

/** Slab test: does the segment a → b pass through box? */
function segmentHits(a: readonly number[], b: readonly number[], box: Box): boolean {
  let t0 = 0
  let t1 = 1
  for (let i = 0; i < 3; i++) {
    const d = b[i] - a[i]
    if (Math.abs(d) < 1e-12) {
      if (a[i] <= box.min[i] || a[i] >= box.max[i]) return false
      continue
    }
    let lo = (box.min[i] - a[i]) / d
    let hi = (box.max[i] - a[i]) / d
    if (lo > hi) [lo, hi] = [hi, lo]
    t0 = Math.max(t0, lo)
    t1 = Math.min(t1, hi)
    if (t0 >= t1) return false
  }
  return true
}

const ASPECTS = [16 / 9, 1440 / 900, 1366 / 768, 4 / 3]
const SUBJECTS = [
  [0, 0.05, 0],
  [0, 1.05, -1.2],
]

describe('opening timings are unchanged by the room', () => {
  it('headline, lid and screen keep their values', () => {
    expect(introVisibility(0.015)).toBeCloseTo(0, 12)
    expect(lidOpen(0.015)).toBe(0)
    expect(lidOpen(0.04)).toBeCloseTo(1, 12)
    expect(screenOn(0.035)).toBeCloseTo(0, 12)
    expect(screenOn(0.05)).toBe(1)
  })
})

describe('room light', () => {
  it('the room is present at the start and recedes, but never goes black', () => {
    expect(roomPresence(0)).toBe(1)
    let prev = Infinity
    for (let p = 0; p <= 1; p += 0.002) {
      const v = roomPresence(p)
      expect(v).toBeLessThanOrEqual(prev + 1e-12)
      expect(v).toBeGreaterThanOrEqual(0.2)
      prev = v
    }
    expect(roomPresence(0.5)).toBeLessThan(roomPresence(0.115))
    expect(roomPresence(0.98)).toBeLessThan(roomPresence(0.5))
    expect(lampLevel(1)).toBeGreaterThan(0.3)
  })

  it('the screen drives the cool spill on the desk', () => {
    expect(deskSpill(0)).toBe(0)
    expect(deskSpill(0.03)).toBeGreaterThan(0)
    expect(deskSpill(0.03)).toBeLessThan(0.25)
    expect(deskSpill(0.05)).toBe(1)
    expect(deskSpill(0.92)).toBeLessThan(deskSpill(0.85))
    expect(deskSpill(0.92)).toBeCloseTo(convergeStages(0.92).screen, 9)
  })

  it('is deterministic and retraces on reverse scroll', () => {
    const pts = [0, 0.015, 0.04, 0.05, 0.2, 0.5, 0.88, 0.95, 1]
    const fwd = pts.map((p) => sceneStateAt(p).room)
    const back = [...pts].reverse().map((p) => sceneStateAt(p).room).reverse()
    expect(back).toEqual(fwd)
  })
})

describe('room layout', () => {
  it('the laptop sits on the desk', () => {
    expect(DESK.top).toBe(0)
    expect(LAPTOP_VOLUME.min[0]).toBeGreaterThan(DESK.minX)
    expect(LAPTOP_VOLUME.max[0]).toBeLessThan(DESK.maxX)
    expect(LAPTOP_VOLUME.max[2]).toBeLessThan(DESK.frontZ)
    expect(LAPTOP_VOLUME.min[2]).toBeGreaterThan(DESK.backZ)
  })

  it('nothing intersects the laptop or its lid sweep', () => {
    for (const prop of ROOM_PROPS) expect(intersects(prop, LAPTOP_VOLUME), prop.name).toBe(false)
  })

  it('desk objects rest on the desk instead of floating', () => {
    for (const prop of ROOM_PROPS.filter((b) => b.onDesk)) expect(prop.min[1], prop.name).toBeCloseTo(DESK.top, 6)
  })

  it('no agent tag sits inside an object', () => {
    for (const tag of TAG_POSITIONS) for (const prop of ROOM_PROPS) expect(inside(tag, prop), prop.name).toBe(false)
  })

  it('the camera never enters an object, and nothing blocks its view of the laptop', () => {
    for (const aspect of ASPECTS) {
      for (let p = 0; p <= 1; p += 0.0025) {
        const { position } = cameraAt(p, aspect)
        for (const prop of ROOM_PROPS) {
          expect(inside(position, grow(prop, 0.3)), `${prop.name} p=${p}`).toBe(false)
          for (const subject of SUBJECTS) expect(segmentHits(position, subject, prop), `${prop.name} p=${p}`).toBe(false)
        }
      }
    }
  })
})

describe('the room adds no React state', () => {
  it('room components drive everything from the progress ref', () => {
    const sources = import.meta.glob('./*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(sources).length).toBeGreaterThan(4)
    for (const [file, src] of Object.entries(sources)) expect(src, file).not.toMatch(/useState|useReducer|setState/)
  })
})
