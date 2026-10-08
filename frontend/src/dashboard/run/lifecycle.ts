import type { ApiError } from '../data/client'
import type { AgentId, Run } from '../data/types'

export type RunView =
  | { kind: 'loading' }
  | { kind: 'active'; run: Run; reconnecting: boolean } // queued | waiting | running, live detail
  | { kind: 'completed'; run: Run }
  | { kind: 'failed'; run: Run; failedAgent: AgentId | null }
  | { kind: 'cancelled'; run: Run }
  | { kind: 'degraded'; run: Run } // stored detail (post-restart DB fallback)
  | { kind: 'not-found'; lastRun: Run | null } // 404; lastRun kept if seen this session
  | { kind: 'unreachable'; lastRun: Run | null } // network/5xx before any success
export type RunEvent = { type: 'loaded'; run: Run } | { type: 'error'; error: ApiError }

export function reduceRunView(prev: RunView, ev: RunEvent): RunView {
  if (ev.type === 'loaded') {
    const run = ev.run
    if (run.detail === 'stored') return { kind: 'degraded', run }
    switch (run.status) {
      case 'completed': return { kind: 'completed', run }
      case 'failed': return { kind: 'failed', run, failedAgent: run.agents.find((a) => a.state === 'failed')?.id ?? null }
      case 'cancelled': return { kind: 'cancelled', run }
      default: return { kind: 'active', run, reconnecting: false }
    }
  }
  const k = ev.error.kind
  if (k === 'aborted') return prev
  if (prev.kind === 'active') return k === 'not-found' ? { kind: 'not-found', lastRun: prev.run } : { ...prev, reconnecting: true }
  if (k === 'not-found') return prev.kind === 'not-found' ? prev : { kind: 'not-found', lastRun: null }
  if (prev.kind === 'loading' || prev.kind === 'unreachable') return { kind: 'unreachable', lastRun: null }
  return prev
}

export function nextPollDelay(view: RunView, failures: number, hidden: boolean): number | null {
  if (hidden) return null
  if (view.kind !== 'active' && view.kind !== 'unreachable' && view.kind !== 'loading') return null
  return failures === 0 ? 1500 : Math.min(15_000, 3000 * 2 ** (failures - 1))
}
