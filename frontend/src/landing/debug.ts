// Test-only introspection. Active only with `?nexus-debug` in the URL; a no-op otherwise.
import type { RefObject } from 'react'

type Reporter = () => unknown

const reporters = new Map<string, Reporter>()

export const debugEnabled = (): boolean =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('nexus-debug')

export function roundDeep(value: unknown): unknown {
  if (typeof value === 'number') return Math.round(value * 1e5) / 1e5
  if (Array.isArray(value)) return value.map(roundDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, roundDeep(v)]))
  }
  return value
}

export function registerReporter(name: string, fn: Reporter): () => void {
  if (!debugEnabled()) return () => {}
  reporters.set(name, fn)
  return () => {
    reporters.delete(name)
  }
}

interface DebugApi {
  scrollToProgress(p: number): void
  snapshot(): unknown
}

type DebugWindow = Window & { __nexus?: DebugApi }

export function installDebugHook({
  section,
  progress,
}: {
  section: RefObject<HTMLElement | null>
  progress: RefObject<number>
}): (() => void) | undefined {
  if (!debugEnabled()) return undefined
  const api: DebugApi = {
    scrollToProgress(p) {
      const el = section.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const range = el.offsetHeight - window.innerHeight
      window.scrollTo(0, Math.round(top + p * range))
    },
    snapshot() {
      const reports = Object.fromEntries([...reporters].map(([name, fn]) => [name, fn()]))
      return roundDeep({ p: progress.current, ...reports })
    },
  }
  ;(window as DebugWindow).__nexus = api
  return () => {
    delete (window as DebugWindow).__nexus
  }
}
