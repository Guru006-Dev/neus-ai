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
  /** True once the scrubbed progress has caught up with the scroll position exactly. */
  settled(): boolean
  /** [scrubbed progress, exact scroll progress], for diagnosing a settle that never completes. */
  progressPair(): [number, number]
}

type DebugWindow = Window & { __nexus?: DebugApi }

export function installDebugHook({
  section,
  progress,
  target,
  rendered,
}: {
  section: RefObject<HTMLElement | null>
  progress: RefObject<number>
  /** The scroll position's exact progress, before scrub smoothing. */
  target: () => number
  /** Progress the scene last rendered at; null while no scene is mounted. */
  rendered?: () => number | null
}): (() => void) | undefined {
  if (!debugEnabled()) return undefined
  // Exact progress of the last requested scroll position. Until the trigger reports it, target() still
  // holds the previous position, which would otherwise read as settled.
  let requested: number | null = null
  const api: DebugApi = {
    scrollToProgress(p) {
      const el = section.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const range = el.offsetHeight - window.innerHeight
      const y = Math.round(top + p * range)
      requested = (y - top) / range
      window.scrollTo(0, y)
    },
    snapshot() {
      const reports = Object.fromEntries([...reporters].map(([name, fn]) => [name, fn()]))
      return roundDeep({ p: progress.current, ...reports })
    },
    settled() {
      // OneRunSection snaps the scrubbed value to the exact scroll progress once it is within GSAP's
      // rounding, so a settled scene matches the target exactly.
      if (requested !== null && Math.abs(target() - requested) > 1e-6) return false
      // A slow frame (software rendering, a heavy scene) can lag the progress; read only after it lands.
      const frame = rendered?.()
      if (frame !== undefined && frame !== null && frame !== progress.current) return false
      return progress.current === target()
    },
    progressPair() {
      return [progress.current, target()]
    },
  }
  ;(window as DebugWindow).__nexus = api
  return () => {
    delete (window as DebugWindow).__nexus
  }
}
