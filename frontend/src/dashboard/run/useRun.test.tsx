// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../data/client'
import { normalizeRun } from '../data/normalize'
import type { Run } from '../data/types'
import { getRun } from '../data/workflows'
import { useRun } from './useRun'
import running from '../../../e2e/fixtures/full-poll-00.json'
import completed from '../../../e2e/fixtures/full-poll-07.json'

vi.mock('../data/workflows', () => ({ getRun: vi.fn() }))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const live = normalizeRun(running)
const done = normalizeRun(completed)
interface Call { id: string; signal?: AbortSignal; settled: boolean; resolve: (r: Run) => void; reject: (e: unknown) => void }
let calls: Call[] = []
let latest: ReturnType<typeof useRun>
let root: Root
let container: HTMLElement

function Probe({ id }: { id: string }) {
  latest = useRun(id)
  return null
}
const unsettled = () => calls.filter((c) => !c.settled).length
const render = (id: string) => act(async () => { root.render(<Probe id={id} />) })
const settle = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const respond = (i: number, run: Run) => act(async () => { calls[i].resolve(run); await vi.advanceTimersByTimeAsync(0) })
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
})

describe('useRun', () => {
  it('fetches immediately, then one request at a time, 1500 ms after each response', async () => {
    await render('a')
    expect(calls).toHaveLength(1)
    expect(latest.view.kind).toBe('loading')
    await settle(5000)
    expect(calls).toHaveLength(1)
    await respond(0, live)
    expect(latest.view.kind).toBe('active')
    await settle(1499)
    expect(calls).toHaveLength(1)
    await settle(1)
    expect(calls).toHaveLength(2)
  })
  it('makes no requests after a terminal response', async () => {
    await render('a')
    await respond(0, done)
    expect(latest.view.kind).toBe('completed')
    await settle(60_000)
    expect(calls).toHaveLength(1)
  })
  it('aborts on id change and ignores a response for a superseded id', async () => {
    await render('a')
    await render('b')
    expect(calls).toHaveLength(2)
    expect(calls[0].signal?.aborted).toBe(true)
    expect(calls[1].id).toBe('b')
    await respond(0, { ...live, id: 'a' })
    expect(latest.view.kind).toBe('loading')
    await settle(5000)
    expect(calls).toHaveLength(2)
    await respond(1, { ...live, id: 'b' })
    expect(latest.view).toMatchObject({ kind: 'active', run: { id: 'b' } })
  })
  it('does not show the previous id view on the render after an id change', async () => {
    await render('a')
    await respond(0, live)
    expect(latest.view.kind).toBe('active')
    await render('b')
    expect(latest.view.kind).toBe('loading')
  })
  it('aborts the in-flight request on unmount', async () => {
    await render('a')
    await respond(0, live)
    await settle(1500)
    expect(calls).toHaveLength(2)
    await act(async () => { root.unmount() })
    expect(calls[1].signal?.aborted).toBe(true)
    await settle(60_000)
    expect(calls).toHaveLength(2)
    root = createRoot(container)
  })
  it('clears the pending timer on unmount', async () => {
    await render('a')
    await respond(0, live)
    await act(async () => { root.unmount() })
    await settle(60_000)
    expect(calls).toHaveLength(1)
    root = createRoot(container)
  })
  it('pauses when hidden and fetches immediately when visible again', async () => {
    await render('a')
    await respond(0, live)
    await setHidden(true)
    await settle(60_000)
    expect(calls).toHaveLength(1)
    await setHidden(false)
    expect(calls).toHaveLength(2)
    await respond(1, live)
    await settle(1500)
    expect(calls).toHaveLength(3)
  })
  it('never overlaps when visibility returns during an in-flight request', async () => {
    await render('a')
    expect(unsettled()).toBe(1)
    await setHidden(true)
    await setHidden(false)
    expect(calls).toHaveLength(2)
    expect(calls[0].signal?.aborted).toBe(true)
    expect(unsettled()).toBe(1)
    await respond(1, live)
    expect(unsettled()).toBe(0)
    await settle(1500)
    expect(calls).toHaveLength(3)
    expect(unsettled()).toBe(1)
    await settle(10_000)
    expect(calls).toHaveLength(3)
  })
  it('does not refetch a terminal run when the tab becomes visible again', async () => {
    await render('a')
    await respond(0, done)
    await setHidden(true)
    await setHidden(false)
    await settle(60_000)
    expect(calls).toHaveLength(1)
  })
  it('does not refetch a not-found run when the tab becomes visible again', async () => {
    await render('a')
    await fail(0, new ApiError('not-found', 'x', 404))
    expect(latest.view.kind).toBe('not-found')
    await setHidden(true)
    await setHidden(false)
    await settle(60_000)
    expect(calls).toHaveLength(1)
  })
  it('keeps data and backs off on errors, stops on 404, and retry restarts from loading', async () => {
    await render('a')
    await respond(0, live)
    await settle(1500)
    await fail(1, new ApiError('unreachable', 'x'))
    expect(latest.view).toMatchObject({ kind: 'active', reconnecting: true })
    await settle(2999)
    expect(calls).toHaveLength(2)
    await settle(1)
    expect(calls).toHaveLength(3)
    await fail(2, new ApiError('not-found', 'x', 404))
    expect(latest.view.kind).toBe('not-found')
    await settle(60_000)
    expect(calls).toHaveLength(3)
    await act(async () => { latest.retry() })
    expect(latest.view.kind).toBe('loading')
    expect(calls).toHaveLength(4)
  })
})
