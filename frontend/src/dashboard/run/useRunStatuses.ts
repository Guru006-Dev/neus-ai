import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../data/client'
import type { LocalRunEntry } from '../data/localRuns'
import { getRun } from '../data/workflows'
import type { RunStatus } from '../ui/status'

export type Lookup = { kind: 'loading' } | { kind: 'found'; status: RunStatus } | { kind: 'missing' } | { kind: 'unknown' }

const POLL_MS = 5000
const MAX_BACKOFF_MS = 60_000
const ACTIVE: RunStatus[] = ['queued', 'waiting', 'running']
const isActive = (l: Lookup | undefined) => l?.kind === 'found' && ACTIVE.includes(l.status)
/** Terminal runs and 404s never change; everything else (first load, active, unavailable) is fetched. */
const needsPoll = (l: Lookup | undefined) => !l || l.kind === 'loading' || l.kind === 'unknown' || isActive(l)

/**
 * One GET /workflows/{id} per entry. Re-polls every 5 s while some run is active; rows left
 * "Status unavailable" by an error are retried with backoff (5 s doubling to 60 s) until they
 * resolve. Terminal and missing rows are not re-fetched. Paused while hidden; aborts on unmount.
 */
export function useRunStatuses(entries: LocalRunEntry[]): Record<string, Lookup> {
  const [lookups, setLookups] = useState<Record<string, Lookup>>({})
  const latest = useRef<Record<string, Lookup>>({})
  const key = entries.map((e) => e.id).join(',')

  useEffect(() => {
    const ids = key === '' ? [] : key.split(',')
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let ctrl: AbortController | undefined
    let failures = 0 // consecutive ticks that left some row unavailable
    const hidden = () => document.visibilityState === 'hidden'
    const put = (id: string, l: Lookup) => {
      latest.current = { ...latest.current, [id]: l }
      setLookups(latest.current)
    }
    const schedule = () => {
      clearTimeout(timer)
      if (!alive || hidden() || !ids.some((id) => needsPoll(latest.current[id]))) return
      const delay = ids.some((id) => isActive(latest.current[id])) || failures === 0 ? POLL_MS : Math.min(MAX_BACKOFF_MS, POLL_MS * 2 ** (failures - 1))
      timer = setTimeout(() => void tick(), delay)
    }
    const tick = async () => {
      clearTimeout(timer)
      ctrl?.abort()
      const c = new AbortController()
      ctrl = c
      await Promise.all(ids.filter((id) => needsPoll(latest.current[id])).map(async (id) => {
        try {
          const run = await getRun(id, c.signal)
          if (!alive || c.signal.aborted) return
          put(id, { kind: 'found', status: run.status })
        } catch (e) {
          if (!alive || c.signal.aborted) return
          if (e instanceof ApiError && e.kind === 'not-found') put(id, { kind: 'missing' })
          else if (latest.current[id]?.kind !== 'found') put(id, { kind: 'unknown' })
        }
      }))
      if (!alive || ctrl !== c || c.signal.aborted) return
      failures = ids.some((id) => latest.current[id]?.kind === 'unknown') ? failures + 1 : 0
      schedule()
    }
    const onVisibility = () => {
      if (!alive) return
      if (hidden()) {
        clearTimeout(timer)
        ctrl?.abort()
      } else if (ids.some((id) => needsPoll(latest.current[id]))) void tick()
    }
    document.addEventListener('visibilitychange', onVisibility)
    void tick()
    return () => {
      alive = false
      clearTimeout(timer)
      ctrl?.abort()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [key])

  return lookups
}
