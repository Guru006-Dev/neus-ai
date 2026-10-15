import { describe, expect, it } from 'vitest'
import { cameraAt, lidOpen, sceneStateAt, screenOn } from '../timeline'
import {
  LID_CLOSED,
  LID_OPEN,
  LID_ORIGIN,
  SCREEN_CENTER_Y,
  SCREEN_DISTANCE_FACTOR,
  SCREEN_H,
  SCREEN_PX_H,
  SCREEN_PX_W,
  SCREEN_W,
  TAG_POSITIONS,
} from './constants'
import {
  BASE,
  KEYS,
  LID,
  TRACKPAD,
  baseTopAt,
  lidCorners,
  lidRotation,
} from './laptop-layout'
import { DESK, LAPTOP_VOLUME, ROOM_PROPS } from './room/layout'

const within = (v: number, lo: number, hi: number) => v >= lo - 1e-9 && v <= hi + 1e-9

describe('lid animation keeps its timings', () => {
  it('closed at 0, starts at 0.015, open by 0.04', () => {
    expect(lidRotation(0)).toBe(LID_CLOSED)
    expect(lidRotation(0.015)).toBeCloseTo(LID_CLOSED, 12)
    expect(lidRotation(0.016)).toBeLessThan(LID_CLOSED)
    expect(lidRotation(0.04)).toBeCloseTo(LID_OPEN, 9)
    expect(lidRotation(0.05)).toBeCloseTo(LID_OPEN, 9)
    expect(lidOpen(0.04)).toBeCloseTo(1, 12)
  })

  it('screen activation is unchanged', () => {
    expect(screenOn(0.035)).toBeCloseTo(0, 12)
    expect(screenOn(0.05)).toBe(1)
  })

  it('opening is monotonic and deterministic in both scroll directions', () => {
    const pts = Array.from({ length: 41 }, (_, i) => (i * 0.05) / 40)
    const fwd = pts.map(lidRotation)
    for (let i = 1; i < fwd.length; i++) expect(fwd[i]).toBeLessThanOrEqual(fwd[i - 1])
    expect([...pts].reverse().map(lidRotation).reverse()).toEqual(fwd)
    expect([...pts].reverse().map((p) => sceneStateAt(p).lidOpen).reverse()).toEqual(pts.map((p) => sceneStateAt(p).lidOpen))
  })
})

describe('the laptop on the desk', () => {
  it('has premium-thin, realistic proportions', () => {
    expect(BASE.width / BASE.depth).toBeGreaterThan(1.3)
    expect(BASE.width / BASE.depth).toBeLessThan(1.5)
    expect(BASE.backHeight).toBeLessThanOrEqual(0.1)
    expect(BASE.frontHeight).toBeLessThan(BASE.backHeight)
    expect(LID.thickness).toBeLessThanOrEqual(0.05)
  })

  it('rests on the desk inside the room-tested footprint', () => {
    expect(BASE.bottom).toBe(DESK.top)
    expect(-BASE.width / 2).toBeGreaterThanOrEqual(LAPTOP_VOLUME.min[0])
    expect(BASE.width / 2).toBeLessThanOrEqual(LAPTOP_VOLUME.max[0])
    expect(BASE.backZ).toBeGreaterThanOrEqual(LAPTOP_VOLUME.min[2])
    expect(BASE.frontZ).toBeLessThanOrEqual(LAPTOP_VOLUME.max[2])
  })

  it('pivots the lid at a hinge on the rear edge of the base', () => {
    expect(LID_ORIGIN[2]).toBeGreaterThan(BASE.backZ)
    expect(LID_ORIGIN[2] - BASE.backZ).toBeLessThan(0.1)
    expect(LID_ORIGIN[1]).toBeGreaterThanOrEqual(baseTopAt(LID_ORIGIN[2]))
  })

  it('the lid sweep stays inside the laptop volume, above the desk and clear of the room', () => {
    for (let p = 0; p <= 0.05; p += 0.0005) {
      for (const [x, y, z] of lidCorners(lidRotation(p))) {
        expect(within(x, LAPTOP_VOLUME.min[0], LAPTOP_VOLUME.max[0]), `x at p=${p}`).toBe(true)
        expect(within(y, LAPTOP_VOLUME.min[1], LAPTOP_VOLUME.max[1]), `y at p=${p}`).toBe(true)
        expect(within(z, LAPTOP_VOLUME.min[2], LAPTOP_VOLUME.max[2]), `z at p=${p}`).toBe(true)
        for (const prop of ROOM_PROPS) {
          const hit = [x, y, z].every((v, i) => v > prop.min[i] && v < prop.max[i])
          expect(hit, `${prop.name} at p=${p}`).toBe(false)
        }
      }
    }
  })

  it('closes flat onto the base without the keys poking through', () => {
    const closed = lidCorners(LID_CLOSED)
    const lowest = Math.min(...closed.map((c) => c[1]))
    expect(lowest).toBeGreaterThanOrEqual(BASE.backHeight - 1e-9)
    expect(KEYS.every((k) => k.top < lowest)).toBe(true)
    const front = Math.max(...closed.map((c) => c[2]))
    expect(front).toBeGreaterThan(BASE.frontZ - 0.05)
    expect(front).toBeLessThan(BASE.frontZ + 0.05)
  })

  it('agent tags and the camera stay outside the laptop', () => {
    const inBase = ([x, y, z]: readonly number[]) =>
      Math.abs(x) < BASE.width / 2 && z > BASE.backZ && z < BASE.frontZ && y < BASE.backHeight
    for (const tag of TAG_POSITIONS) expect(inBase(tag)).toBe(false)
    for (const aspect of [16 / 9, 1440 / 900, 1366 / 768, 4 / 3]) {
      for (let p = 0; p <= 1; p += 0.0025) {
        const [x, y, z] = cameraAt(p, aspect).position
        const inVolume = [x, y, z].every((v, i) => v > LAPTOP_VOLUME.min[i] - 0.3 && v < LAPTOP_VOLUME.max[i] + 0.3)
        expect(inVolume, `p=${p}`).toBe(false)
      }
    }
  })
})

describe('screen, keyboard and trackpad', () => {
  it('the screen keeps the exact geometry ScreenContent renders into', () => {
    expect([SCREEN_W, SCREEN_H, SCREEN_CENTER_Y, SCREEN_PX_W, SCREEN_PX_H]).toEqual([2.6, 1.625, 1.02, 1280, 800])
    expect(SCREEN_DISTANCE_FACTOR).toBeCloseTo((SCREEN_W * 400) / SCREEN_PX_W, 12)
    expect(SCREEN_W / SCREEN_H).toBeCloseTo(16 / 10, 12)
  })

  it('the screen sits inside the lid with a thin dark bezel', () => {
    const side = (LID.width - SCREEN_W) / 2
    const top = LID.top - (SCREEN_CENTER_Y + SCREEN_H / 2)
    const chin = SCREEN_CENTER_Y - SCREEN_H / 2 - LID.bottom
    expect(side).toBeGreaterThan(0.04)
    expect(side).toBeLessThanOrEqual(0.12)
    expect(top).toBeGreaterThan(0.04)
    expect(top).toBeLessThanOrEqual(0.15)
    expect(chin).toBeGreaterThan(0.04)
  })

  it('the keyboard and a large trackpad fit the deck without overlapping', () => {
    const deck = { minX: -BASE.width / 2 + 0.05, maxX: BASE.width / 2 - 0.05, minZ: BASE.backZ + 0.05, maxZ: BASE.frontZ - 0.04 }
    for (const k of KEYS) {
      expect(within(k.x - k.w / 2, deck.minX, deck.maxX) && within(k.x + k.w / 2, deck.minX, deck.maxX)).toBe(true)
      expect(within(k.z - k.d / 2, deck.minZ, deck.maxZ) && within(k.z + k.d / 2, deck.minZ, deck.maxZ)).toBe(true)
      expect(k.z + k.d / 2).toBeLessThan(TRACKPAD.z - TRACKPAD.depth / 2)
      expect(k.top).toBeLessThanOrEqual(baseTopAt(k.z) + 0.004)
    }
    expect(TRACKPAD.width * TRACKPAD.depth).toBeGreaterThan(0.95 * 0.55 * 1.4)
    expect(TRACKPAD.z + TRACKPAD.depth / 2).toBeLessThan(BASE.frontZ)
    expect(KEYS.length).toBeGreaterThan(60)
  })
})
