// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../data/client'
import { getSystemStatus } from '../data/system'
import type { SystemSnapshot } from '../data/types'
import { useSystemStatus } from './useSystemStatus'

vi.mock('../data/system', () => ({ getSystemStatus: vi.fn() }))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const snap: SystemSnapshot = { workflows: { running: 1, queued: 0, completed: 4, failed: 0 }, agents: [] }
let latest: ReturnType<typeof useSystemStatus>
let root: Root
let signals: (AbortSignal | undefined)[] = []
function Probe() {
  latest = useSystemStatus()
  return null
}
const settle = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const setHidden = (hidden: boolean) => act(async () => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') })
  document.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(0)
})

beforeEach(() => {
  vi.useFakeTimers()
  signals = []
  vi.mocked(getSystemStatus).mockReset()
  vi.mocked(getSystemStatus).mockImplementation(async (s) => { signals.push(s); return snap })
  root = createRoot(document.createElement('div'))
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  vi.useRealTimers()
})

describe('useSystemStatus', () => {
  it('starts connecting, then connected with a snapshot', async () => {
    let resolve!: (s: SystemSnapshot) => void
    vi.mocked(getSystemStatus).mockImplementationOnce(() => new Promise((r) => { resolve = r }))
    await act(async () => { root.render(<Probe />) })
    expect(latest).toEqual({ status: 'connecting', snapshot: null })
    await act(async () => { resolve(snap) })
    expect(latest).toEqual({ status: 'connected', snapshot: snap })
  })
  it('polls every 10 s', async () => {
    await act(async () => { root.render(<Probe />) })
    expect(getSystemStatus).toHaveBeenCalledTimes(1)
    await settle(9999)
    expect(getSystemStatus).toHaveBeenCalledTimes(1)
    await settle(1)
    expect(getSystemStatus).toHaveBeenCalledTimes(2)
  })
  it('reports unreachable on failure and recovers', async () => {
    vi.mocked(getSystemStatus).mockRejectedValueOnce(new ApiError('unreachable', 'x'))
    await act(async () => { root.render(<Probe />) })
    expect(latest).toEqual({ status: 'unreachable', snapshot: null })
    await settle(10_000)
    expect(latest.status).toBe('connected')
  })
  it('keeps the last snapshot when a later poll fails', async () => {
    await act(async () => { root.render(<Probe />) })
    vi.mocked(getSystemStatus).mockRejectedValueOnce(new ApiError('server', 'x', 500))
    await settle(10_000)
    expect(latest).toEqual({ status: 'unreachable', snapshot: snap })
  })
  it('pauses while hidden and refreshes when visible again', async () => {
    await act(async () => { root.render(<Probe />) })
    await setHidden(true)
    await settle(60_000)
    expect(getSystemStatus).toHaveBeenCalledTimes(1)
    await setHidden(false)
    expect(getSystemStatus).toHaveBeenCalledTimes(2)
    await settle(10_000)
    expect(getSystemStatus).toHaveBeenCalledTimes(3)
  })
  it('aborts and stops polling on unmount', async () => {
    await act(async () => { root.render(<Probe />) })
    await act(async () => { root.unmount() })
    expect(signals[0]?.aborted).toBe(true)
    await settle(60_000)
    expect(getSystemStatus).toHaveBeenCalledTimes(1)
    root = createRoot(document.createElement('div'))
  })
})
