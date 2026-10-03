import { describe, expect, it } from 'vitest'
import {
  AGENT_RANGES,
  agentStatuses,
  assignedCount,
  cameraAt,
  convergeStages,
  frameAt,
  frameKey,
  hudFade,
  introVisibility,
  lidOpen,
  ringState,
  sceneStateAt,
  screenMix,
  tagReveal,
  tagScale,
} from './timeline'

const speed = (p: number, aspect?: number) => {
  const a = cameraAt(p - 1e-5, aspect).position
  const b = cameraAt(p + 1e-5, aspect).position
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 2e-5
}

describe('opening', () => {
  it('no agent tag shows before the orchestrator assigns it', () => {
    for (let p = 0; p < 0.12; p += 0.002) for (let i = 0; i < 6; i++) expect(tagReveal(p, i)).toBe(0)
    for (let p = 0.12; p < 0.2; p += 0.0005) {
      const assigned = assignedCount(frameAt(p).progress)
      for (let i = 0; i < 6; i++) if (tagReveal(p, i) > 0) expect(assigned).toBeGreaterThan(i)
    }
    for (let i = 0; i < 6; i++) expect(tagReveal(0.2, i)).toBe(1)
  })

  it('tags appear in assignment order', () => {
    const first = (i: number) => {
      for (let p = 0.12; p <= 0.2; p += 0.0001) if (tagReveal(p, i) > 0) return p
      return 1
    }
    for (let i = 1; i < 6; i++) expect(first(i)).toBeGreaterThan(first(i - 1))
  })

  it('the headline is gone before the lid starts to move', () => {
    for (let p = 0; p < 0.06; p += 0.0005) if (lidOpen(p) > 0) expect(introVisibility(p)).toBe(0)
  })
})

describe('camera', () => {
  it('keeps moving through keyframes instead of stopping at each one', () => {
    for (const p of [0.05, 0.2, 0.5, 0.8]) expect(speed(p)).toBeGreaterThan(0.5)
  })

  it('rests deliberately on the prompt close-up, the network hold and the final stillness', () => {
    expect(speed(0.115)).toBeLessThan(0.05)
    expect(speed(0.88)).toBeLessThan(0.05)
    expect(speed(0.975)).toBeLessThan(0.05)
  })

  it('leans subtly toward the active side', () => {
    expect(cameraAt(0.25).position[0]).toBeLessThan(-0.1)
    expect(cameraAt(0.65).position[0]).toBeGreaterThan(0.1)
    for (let p = 0.2; p < 0.8; p += 0.01) expect(Math.abs(cameraAt(p).position[0])).toBeLessThan(0.4)
  })

  it('is a pure function of p', () => {
    for (let p = 0; p <= 1; p += 0.017) expect(cameraAt(p)).toEqual(cameraAt(p))
  })
})

describe('agent hand-off and network', () => {
  it('each new agent draws a hand-off edge from the previous one', () => {
    for (let k = 0; k < 5; k++) {
      const start = AGENT_RANGES[k + 1].start
      expect(ringState(start - 0.001, k).draw).toBe(0)
      expect(ringState(start + 0.02, k).draw).toBe(1)
      const peak = ringState(start + 0.01, k).opacity
      const settled = ringState(start + 0.06, k).opacity
      expect(peak).toBeGreaterThan(settled)
      expect(settled).toBeGreaterThan(0)
    }
  })

  it('completed edges persist, and the closing edge is drawn in the network reveal', () => {
    for (let p = 0.72; p < 0.9; p += 0.01) for (let k = 0; k < 5; k++) expect(ringState(p, k).draw).toBe(1)
    expect(ringState(0.79, 5).draw).toBe(0)
    expect(ringState(0.86, 5).draw).toBe(1)
    expect(ringState(0.88, 0).opacity).toBeGreaterThan(ringState(0.75, 0).opacity)
  })

  it('tags shrink with the camera pull-back and on narrower screens', () => {
    expect(tagScale(0.5)).toBeLessThanOrEqual(1)
    expect(tagScale(0.88)).toBeLessThan(tagScale(0.5))
    expect(tagScale(0.88, 4 / 3)).toBeLessThan(tagScale(0.88))
  })
})

describe('convergence', () => {
  it('runs as a sequence, not a crossfade', () => {
    const at = convergeStages
    expect(at(0.9)).toMatchObject({ tags: 0, morph: 0, thicken: 0, nodes: 0 })
    expect(at(0.915)).toMatchObject({ tags: 1, morph: 0, thicken: 0, nodes: 0 })
    expect(at(0.915).screen).toBeCloseTo(0.15, 6)
    expect(at(0.93).morph).toBeGreaterThan(0)
    expect(at(0.93)).toMatchObject({ thicken: 0, nodes: 0 })
    expect(at(0.952).thicken).toBeGreaterThan(0)
    expect(at(0.952).nodes).toBe(0)
    expect(at(0.962).nodes).toBeGreaterThan(0)
    expect(at(0.97)).toMatchObject({ tags: 1, morph: 1, thicken: 1, nodes: 1 })
    expect(at(0.95).laptop).toBeLessThan(at(0.9).laptop)
  })

  it('is deterministic', () => {
    for (const p of [0.905, 0.92, 0.947, 0.958, 0.966]) expect(convergeStages(p)).toEqual(convergeStages(p))
  })
})

describe('screen transitions', () => {
  it('crossfades for a short window after each view change', () => {
    expect(frameAt(0.305)).toMatchObject({ view: 'knowledge', outgoing: 'explorer' })
    expect(frameAt(0.125)).toMatchObject({ view: 'orchestrator', outgoing: 'prompt' })
    expect(frameAt(0.33).outgoing).toBeNull()
    expect(frameAt(0.85).outgoing).toBeNull()
    expect(screenMix(0.3)).toBe(0)
    expect(screenMix(0.306)).toBeGreaterThan(0)
    expect(screenMix(0.306)).toBeLessThan(1)
    expect(screenMix(0.33)).toBe(1)
    expect(frameKey(frameAt(0.305))).not.toBe(frameKey({ ...frameAt(0.305), outgoing: null }))
  })
})

describe('ending', () => {
  it('caption and rail are gone by the stillness, before the CTA arrives', () => {
    expect(hudFade(0.95)).toBe(1)
    expect(hudFade(0.97)).toBe(0)
    expect(sceneStateAt(0.975).hud).toBe(0)
  })

  it('still one active agent at a time', () => {
    for (let p = 0.2; p < 0.8; p += 0.007) expect(agentStatuses(p).filter((s) => s === 'active')).toHaveLength(1)
  })
})
