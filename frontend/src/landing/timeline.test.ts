import { describe, expect, it } from 'vitest'
import {
  AGENT_RANGES,
  PHASES,
  SCREEN_STEPS,
  agentAt,
  agentStatuses,
  cameraAt,
  connectionProgress,
  frameAt,
  localProgress,
  phaseAt,
  sceneStateAt,
} from './timeline'

describe('timeline', () => {
  it('phases and agent ranges are contiguous and match the spec', () => {
    PHASES.forEach((ph, i) => expect(ph.start).toBe(i === 0 ? 0 : PHASES[i - 1].end))
    expect(PHASES.at(-1)!.end).toBe(1)
    expect(AGENT_RANGES.map((r) => [r.id, r.start, r.end])).toEqual([
      ['explorer', 0.2, 0.3],
      ['knowledge', 0.3, 0.4],
      ['documentation', 0.4, 0.5],
      ['qa', 0.5, 0.6],
      ['demo', 0.6, 0.7],
      ['release', 0.7, 0.8],
    ])
  })

  it('phaseAt boundaries', () => {
    const cases: [number, string][] = [
      [-1, 'open'], [0, 'open'], [0.05, 'goal'], [0.12, 'orchestrate'], [0.2, 'agents'],
      [0.8, 'network'], [0.9, 'converge'], [0.97, 'still'], [1, 'still'], [2, 'still'],
    ]
    for (const [p, id] of cases) expect(phaseAt(p)).toBe(id)
  })

  it('active-agent rule', () => {
    expect(agentStatuses(0.35)).toEqual(['done', 'active', 'idle', 'idle', 'idle', 'idle'])
    expect(agentStatuses(0.1).every((s) => s === 'idle')).toBe(true)
    expect(agentStatuses(0.8).every((s) => s === 'done')).toBe(true)
    for (let p = 0.2; p < 0.8; p += 0.013) {
      expect(agentStatuses(p).filter((s) => s === 'active')).toHaveLength(1)
    }
    expect([agentAt(0.19), agentAt(0.2), agentAt(0.79), agentAt(0.8)]).toEqual([null, 'explorer', 'release', null])
  })

  it('progress helpers stay in [0,1] and are monotonic', () => {
    let prev = -1
    for (let p = 0; p <= 1; p += 0.001) {
      const v = localProgress(p, AGENT_RANGES[2])
      expect(v).toBeGreaterThanOrEqual(prev)
      expect(v).toBeLessThanOrEqual(1)
      prev = v
    }
    expect(connectionProgress(0.1, 0)).toBe(0)
    expect(connectionProgress(0.22, 0)).toBeCloseTo(0.5, 6)
    expect(connectionProgress(0.35, 0)).toBe(1)
  })

  it('camera is continuous, and a narrower aspect pulls it back', () => {
    for (let p = 0; p < 1; p += 0.01) {
      const a = cameraAt(p).position
      const b = cameraAt(p + 1e-4).position
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.01)
    }
    expect(cameraAt(0.5, 1).position[2]).toBeGreaterThan(cameraAt(0.5).position[2])
  })

  it('frames are quantized', () => {
    const f = frameAt(0.25)
    expect(f.view).toBe('explorer')
    expect(Number.isInteger(Math.round(f.progress * SCREEN_STEPS * 1e9) / 1e9)).toBe(true)
    expect(frameAt(0.85)).toMatchObject({ view: 'release', progress: 1 })
    expect(frameAt(0.02).view).toBe('prompt')
  })

  it('Test A (pure): jumping 0.2 → 0.7 → 0.2 equals a direct visit', () => {
    const direct = [sceneStateAt(0.2), frameAt(0.2)]
    sceneStateAt(0.7)
    frameAt(0.7)
    expect([sceneStateAt(0.2), frameAt(0.2)]).toEqual(direct)
  })

  it('Test B (pure): a reverse sweep mirrors the forward sweep', () => {
    const pts = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 0.93, 0.985]
    const forward = pts.map((p) => sceneStateAt(p))
    const backward = [...pts].reverse().map((p) => sceneStateAt(p)).reverse()
    expect(backward).toEqual(forward)
  })
})
