import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalRuns, KEY } from './localRuns'

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, get length() { return m.size } } as Storage
}

describe('local run index', () => {
  let store: Storage
  beforeEach(() => { store = memoryStorage() })

  it('adds newest first, de-duplicates and caps at 50', () => {
    const runs = createLocalRuns(store)
    for (let i = 0; i < 55; i++) runs.add({ id: `wf-${i}`, goal: `g${i}`, submittedAt: new Date(i * 1000).toISOString() })
    runs.add({ id: 'wf-54', goal: 'again', submittedAt: new Date(99e6).toISOString() })
    const list = runs.list()
    expect(list).toHaveLength(50)
    expect(list[0]).toMatchObject({ id: 'wf-54', goal: 'again' })
    expect(new Set(list.map((r) => r.id)).size).toBe(50)
  })

  it('stores only id, goal and submittedAt', () => {
    createLocalRuns(store).add({ id: 'wf-1', goal: 'g', submittedAt: '2026-10-03T00:00:00.000Z' })
    expect(JSON.parse(store.getItem(KEY)!)).toEqual({ version: 1, runs: [{ id: 'wf-1', goal: 'g', submittedAt: '2026-10-03T00:00:00.000Z' }] })
  })

  it('recovers from corrupt or foreign data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    store.setItem(KEY, '{nope')
    expect(createLocalRuns(store).list()).toEqual([])
    store.setItem(KEY, JSON.stringify({ version: 9, runs: [1] }))
    expect(createLocalRuns(store).list()).toEqual([])
    warn.mockRestore()
  })

  it('survives a throwing storage by keeping the index in memory', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } } as unknown as Storage
    const runs = createLocalRuns(broken)
    runs.add({ id: 'wf-1', goal: 'g', submittedAt: 'x' })
    expect(runs.list().map((r) => r.id)).toEqual(['wf-1'])
  })

  it('keeps adding and removing from memory after storage has thrown', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } } as unknown as Storage
    const runs = createLocalRuns(broken)
    runs.add({ id: 'wf-1', goal: 'g', submittedAt: 'x' })
    runs.add({ id: 'wf-2', goal: 'g', submittedAt: 'y' })
    runs.remove('wf-1')
    expect(runs.list().map((r) => r.id)).toEqual(['wf-2'])
  })

  it('works with no storage at all (server render)', () => {
    const runs = createLocalRuns(null)
    runs.add({ id: 'wf-1', goal: 'g', submittedAt: 'x' })
    runs.add({ id: 'wf-2', goal: 'g', submittedAt: 'y' })
    expect(runs.list().map((r) => r.id)).toEqual(['wf-2', 'wf-1'])
  })

  it('returns a stable list reference until something changes', () => {
    const runs = createLocalRuns(store)
    expect(runs.list()).toBe(runs.list())
    runs.add({ id: 'wf-1', goal: 'g', submittedAt: 'x' })
    const a = runs.list()
    expect(runs.list()).toBe(a)
    runs.add({ id: 'wf-2', goal: 'g', submittedAt: 'y' })
    expect(runs.list()).not.toBe(a)
  })

  it('re-reads storage after invalidate (cross-tab)', () => {
    const runs = createLocalRuns(store)
    const fn = vi.fn()
    runs.subscribe(fn)
    expect(runs.list()).toEqual([])
    store.setItem(KEY, JSON.stringify({ version: 1, runs: [{ id: 'wf-9', goal: 'g', submittedAt: 'x' }] }))
    runs.invalidate()
    expect(runs.list().map((r) => r.id)).toEqual(['wf-9'])
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('removes and notifies subscribers', () => {
    const runs = createLocalRuns(store)
    const fn = vi.fn()
    runs.subscribe(fn)
    runs.add({ id: 'wf-1', goal: 'g', submittedAt: 'x' })
    runs.remove('wf-1')
    expect(runs.list()).toEqual([])
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
