// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../data/client'
import { localRuns } from '../data/localRuns'
import type { Run } from '../data/types'
import { getRun } from '../data/workflows'
import { useLatestOutput } from './useLatestOutput'

vi.mock('../data/workflows', () => ({ getRun: vi.fn() }))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mk = (id: string, withKnowledge: boolean): Run => ({
  id, goal: `goal ${id}`, status: 'completed', detail: 'live', agents: [], activeAgent: null, elapsedMs: null,
  outputs: withKnowledge ? ({ knowledge: { kind: 'knowledge' } } as unknown as Run['outputs']) : {},
})
let latest: ReturnType<typeof useLatestOutput>
let root: Root
let container: HTMLElement
let signals: Record<string, AbortSignal | undefined>
const order: string[] = []

function Probe() {
  latest = useLatestOutput('knowledge')
  return null
}
// wf-r{n} is newer for larger n (add() prepends, so insert oldest first).
const seedRuns = (n: number) => {
  for (let i = 1; i <= n; i++) localRuns.add({ id: `wf-r${i}`, goal: `g${i}`, submittedAt: `2026-10-0${i}T10:00:00.000Z` })
}
const mount = () => act(async () => { root.render(<Probe />) })
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })
const clear = () => { for (const e of localRuns.list()) localRuns.remove(e.id) }

beforeEach(() => {
  signals = {}
  order.length = 0
  clear()
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  clear()
  vi.mocked(getRun).mockReset()
})

describe('useLatestOutput', () => {
  it("is 'none' with an empty index and fetches nothing", async () => {
    await mount()
    await flush()
    expect(latest.state).toBe('none')
    expect(getRun).not.toHaveBeenCalled()
  })
  it('walks newest-first and returns the first run having the output', async () => {
    seedRuns(3)
    vi.mocked(getRun).mockImplementation(async (id) => { order.push(id); return mk(id, id === 'wf-r2') })
    await mount()
    await flush()
    expect(order).toEqual(['wf-r3', 'wf-r2'])
    expect(latest).toMatchObject({ state: 'found', runId: 'wf-r2', goal: 'g2' })
  })
  it("checks at most 5 entries then reports 'none'", async () => {
    seedRuns(8)
    vi.mocked(getRun).mockImplementation(async (id) => { order.push(id); return mk(id, false) })
    await mount()
    await flush()
    expect(order).toEqual(['wf-r8', 'wf-r7', 'wf-r6', 'wf-r5', 'wf-r4'])
    expect(latest.state).toBe('none')
  })
  it('skips runs missing on the backend', async () => {
    seedRuns(2)
    vi.mocked(getRun).mockImplementation(async (id) => {
      if (id === 'wf-r2') throw new ApiError('not-found', 'x', 404)
      return mk(id, true)
    })
    await mount()
    await flush()
    expect(latest).toMatchObject({ state: 'found', runId: 'wf-r1' })
  })
  it("reports 'error' when nothing was found and a lookup failed", async () => {
    seedRuns(1)
    vi.mocked(getRun).mockRejectedValue(new ApiError('unreachable', 'x'))
    await mount()
    await flush()
    expect(latest.state).toBe('error')
  })
  it('aborts in-flight fetches on unmount', async () => {
    seedRuns(2)
    vi.mocked(getRun).mockImplementation((id, signal) => { signals[id] = signal; return new Promise<Run>(() => {}) })
    await mount()
    expect(signals['wf-r2']?.aborted).toBe(false)
    await act(async () => { root.unmount() })
    expect(signals['wf-r2']?.aborted).toBe(true)
    expect(Object.keys(signals)).toEqual(['wf-r2'])
    root = createRoot(container)
  })
})
