import { afterEach, describe, expect, it, vi } from 'vitest'
import { installDebugHook, roundDeep } from './debug'

describe('roundDeep', () => {
  it('rounds numbers to 1e-5, recursively', () => {
    expect(roundDeep({ a: [1.123456789], b: { c: 2.0000001 }, s: 'x' })).toEqual({ a: [1.12346], b: { c: 2 }, s: 'x' })
  })
})

describe('settled', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('stays false until the trigger has seen the requested scroll position', () => {
    const win = {
      location: { search: '?nexus-debug' },
      scrollY: 0,
      innerHeight: 1080,
      scrollTo: (_x: number, y: number) => {
        win.scrollY = y
      },
    }
    vi.stubGlobal('window', win)
    const section = { current: { offsetHeight: 10800, getBoundingClientRect: () => ({ top: -win.scrollY }) } }
    const progress = { current: 0.6 }
    let triggerProgress = 0.6
    installDebugHook({ section: section as never, progress, target: () => triggerProgress })
    const api = (win as unknown as { __nexus: { scrollToProgress(p: number): void; settled(): boolean } }).__nexus

    api.scrollToProgress(0.5)
    expect(api.settled()).toBe(false)

    triggerProgress = 0.5
    progress.current = 0.5
    expect(api.settled()).toBe(true)
  })

  it('stays false until a frame has rendered at the current progress', () => {
    const win = { location: { search: '?nexus-debug' }, scrollY: 0, innerHeight: 1080, scrollTo: () => {} }
    vi.stubGlobal('window', win)
    const progress = { current: 0.5 }
    let rendered: number | null = 0.49
    installDebugHook({ section: { current: null }, progress, target: () => 0.5, rendered: () => rendered })
    const api = (win as unknown as { __nexus: { settled(): boolean } }).__nexus
    expect(api.settled()).toBe(false)
    rendered = 0.5
    expect(api.settled()).toBe(true)
  })
})
