import { useEffect, useState } from 'react'
import { ApiError } from '../data/client'
import { localRuns } from '../data/localRuns'
import type { AgentId } from '../data/types'
import { getRun } from '../data/workflows'
import { useLocalRuns } from './useLocalRuns'

export interface LatestOutput { state: 'none' | 'loading' | 'found' | 'error'; runId?: string; goal?: string }

const MAX_CHECKED = 5

/** Walks the local run index newest-first (at most 5 runs) for the first run that has an output for `agent`. */
export function useLatestOutput(agent: AgentId): LatestOutput {
  const entries = useLocalRuns()
  const key = entries.slice(0, MAX_CHECKED).map((e) => e.id).join(',')
  const [result, setResult] = useState<{ key: string; agent: AgentId; value: LatestOutput } | null>(null)

  useEffect(() => {
    const c = new AbortController()
    const candidates = localRuns.list().slice(0, MAX_CHECKED)
    if (candidates.length === 0) return
    void (async () => {
      let failed = false
      for (const e of candidates) {
        if (c.signal.aborted) return
        try {
          const run = await getRun(e.id, c.signal)
          if (c.signal.aborted) return
          if (run.outputs[agent]) {
            setResult({ key, agent, value: { state: 'found', runId: e.id, goal: e.goal } })
            return
          }
        } catch (err) {
          if (c.signal.aborted) return
          if (!(err instanceof ApiError && err.kind === 'not-found')) failed = true
        }
      }
      if (!c.signal.aborted) setResult({ key, agent, value: { state: failed ? 'error' : 'none' } })
    })()
    return () => c.abort()
  }, [key, agent])

  if (key === '') return { state: 'none' }
  return result && result.key === key && result.agent === agent ? result.value : { state: 'loading' }
}
