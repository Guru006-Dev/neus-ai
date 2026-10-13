// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../data/client'
import type { LocalRunEntry } from '../data/localRuns'
import type { Run } from '../data/types'
import { getRun } from '../data/workflows'
import type { RunStatus } from '../ui/status'
import { useRunStatuses, type Lookup } from './useRunStatuses'

vi.mock('../data/workflows', () => ({ getRun: vi.fn() }))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface Call { id: string; signal?: AbortSignal; settled: boolean; resolve: (r: Run) => void; reject: (e: unknown) => void }
let calls: Call[] = []
let latest: Record<string, Lookup>
let root: Root
let container: HTMLElement

const entry = (id: string): LocalRunEntry => ({ id, goal: `goal ${id}`, submittedAt: '2026-01-01T00:00:00Z' })
const asRun = (status: RunStatus) => ({ status }) as unknown as Run

function Probe({ ids }: { ids: string[] }) {
  latest = useRunStatuses(ids.map(entry))
  return null
}
const unsettled = (id?: string) => calls.filter((c) => !c.settled && (id === undefined || c.id === id)).length
const render = (ids: string[]) => act(async () => { root.render(<Probe ids={ids} />) })
const settle = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const respond = (i: number, status: RunStatus) => act(async () => { calls[i].resolve(asRun(status)); await vi.advanceTimersByTimeAsync(0) })
const fail = (i: number, e: unknown) => act(async () => { calls[i].reject(e); await vi.advanceTimersByTimeAsync(0) })
const setHidden = (hidden: boolean) => act(async () => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') })
  document.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(0)
})

beforeEach(() => {
  vi.useFakeTimers()
  calls = []
  vi.mocked(getRun).mockImplementation((id, signal) => new Promise<Run>((resolve, reject) => {
    const call: Call = {
      id, signal, settled: false,
      resolve: (r) => { call.settled = true; resolve(r) },
      reject: (e) => { call.settled = true; reject(e) },
    }
    signal?.addEventListener('abort', () => call.reject(new ApiError('aborted', 'aborted')), { once: true })
    calls.push(call)
  }))
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useRunStatuses', () => {
  it.each(['queued', 'waiting', 'running'] as const)('refreshes a %s run every 5 s, one unsettled call per row', async (status) => {
    await render(['a', 'b'])
    expect(calls).toHaveLength(2)
    expect(latest).toEqual({})
    await respond(0, status)
    await respond(1, status)
    expect(latest.a).toEqual({ kind: 'found', status })
    await settle(4999)
    expect(calls).toHaveLength(2)
    await settle(1)
    expect(calls).toHaveLength(4)
    expect(unsettled('a')).toBe(1)
    expect(unsettled('b')).toBe(1)
    // a slow response never triggers an overlapping request
    await settle(60_000)
    expect(calls).toHaveLength(4)
    expect(unsettled('a')).toBe(1)
    expect(unsettled('b')).toBe(1)
    await respond(2, status)
    await respond(3, status)
    await settle(4999)
    expect(calls).toHaveLength(4)
    await settle(1)
    expect(calls).toHaveLength(6)
  })

  it.each(['completed', 'failed'] as const)('stops polling after a %s response', async (status) => {
    await render(['a'])
    await respond(0, status)
    expect(latest.a).toEqual({ kind: 'found', status })
    await settle(60_000)
    expect(calls).toHaveLength(1)
  })

  it('keeps polling while any one row is still active, without re-fetching the finished one', async () => {
    await render(['a', 'b'])
    await respond(0, 'completed')
    await respond(1, 'running')
    await settle(5000)
    expect(calls.map((c) => c.id)).toEqual(['a', 'b', 'b'])
  })

  it('pauses while hidden and fetches immediately, then every 5 s, when visible again', async () => {
    await render(['a'])
    await respond(0, 'running')
    await setHidden(true)
    await settle(60_000)
    expect(calls).toHaveLength(1)
    await setHidden(false)
    expect(calls).toHaveLength(2)
    await respond(1, 'running')
    await settle(4999)
    expect(calls).toHaveLength(2)
    await settle(1)
    expect(calls).toHaveLength(3)
  })

  it('aborts the in-flight request and stays idle when hidden before it settles', async () => {
    await render(['a'])
    await setHidden(true)
    expect(calls[0].signal?.aborted).toBe(true)
    await settle(60_000)
    expect(calls).toHaveLength(1)
  })

  it('aborts pending requests, clears timers and removes the listener on unmount', async () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    await render(['a', 'b'])
    await respond(0, 'running')
    await respond(1, 'running')
    await settle(5000)
    expect(calls).toHaveLength(4)
    await act(async () => { root.unmount() })
    expect(calls[2].signal?.aborted).toBe(true)
    expect(calls[3].signal?.aborted).toBe(true)
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    await settle(60_000)
    expect(calls).toHaveLength(4)
    await setHidden(true)
    await setHidden(false)
    expect(calls).toHaveLength(4)
    root = createRoot(container)
  })

  it('clears the pending poll timer on unmount', async () => {
    await render(['a'])
    await respond(0, 'running')
    await act(async () => { root.unmount() })
    await settle(60_000)
    expect(calls).toHaveLength(1)
    root = createRoot(container)
  })

  it('reports a 404 row as missing (rendered as "Not on backend") and does not poll it', async () => {
    await render(['a'])
    await fail(0, new ApiError('not-found', 'x', 404))
    expect(latest.a).toEqual({ kind: 'missing' })
    await settle(60_000)
    expect(calls).toHaveLength(1)
  })

  it('reports unreachable rows as unknown, not missing', async () => {
    await render(['a'])
    await fail(0, new ApiError('unreachable', 'x'))
    expect(latest.a).toEqual({ kind: 'unknown' })
  })

  it('re-polls a "Status unavailable" row and recovers when the backend answers', async () => {
    await render(['a'])
    await fail(0, new ApiError('unreachable', 'x'))
    expect(latest.a).toEqual({ kind: 'unknown' })
    await settle(4999)
    expect(calls).toHaveLength(1)
    await settle(1)
    expect(calls).toHaveLength(2)
    await respond(1, 'completed')
    expect(latest.a).toEqual({ kind: 'found', status: 'completed' })
    await settle(60_000)
    expect(calls).toHaveLength(2)
  })

  it('backs off 5 s → 10 s → 20 s while a row keeps failing', async () => {
    await render(['a'])
    await fail(0, new ApiError('unreachable', 'x'))
    await settle(5000)
    expect(calls).toHaveLength(2)
    await fail(1, new ApiError('unreachable', 'x'))
    await settle(9999)
    expect(calls).toHaveLength(2)
    await settle(1)
    expect(calls).toHaveLength(3)
    await fail(2, new ApiError('unreachable', 'x'))
    await settle(19_999)
    expect(calls).toHaveLength(3)
    await settle(1)
    expect(calls).toHaveLength(4)
  })

  it('retries only the unavailable row; terminal and missing rows are not re-polled', async () => {
    await render(['a', 'b', 'c'])
    await respond(0, 'completed')
    await fail(1, new ApiError('not-found', 'x', 404))
    await fail(2, new ApiError('unreachable', 'x'))
    await settle(5000)
    expect(calls.map((c) => c.id)).toEqual(['a', 'b', 'c', 'c'])
    await respond(3, 'failed')
    expect(latest.c).toEqual({ kind: 'found', status: 'failed' })
    await settle(60_000)
    expect(calls).toHaveLength(4)
  })
})
