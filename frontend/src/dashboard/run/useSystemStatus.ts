import { useEffect, useState } from 'react'
import { getSystemStatus } from '../data/system'
import type { SystemSnapshot } from '../data/types'

export type SystemConnection = 'connecting' | 'connected' | 'unreachable'
export interface SystemStatusState { status: SystemConnection; snapshot: SystemSnapshot | null }

const POLL_MS = 10_000

/** Polls the backend system status every 10 s; paused while the tab is hidden. */
export function useSystemStatus(): SystemStatusState {
  const [state, setState] = useState<SystemStatusState>({ status: 'connecting', snapshot: null })
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let ctrl: AbortController | undefined
    const hidden = () => document.visibilityState === 'hidden'
    const schedule = () => {
      clearTimeout(timer)
      if (alive && !hidden()) timer = setTimeout(() => void tick(), POLL_MS)
    }
    const tick = async () => {
      clearTimeout(timer)
      ctrl?.abort()
      const c = new AbortController()
      ctrl = c
      try {
        const snapshot = await getSystemStatus(c.signal)
        if (!alive || ctrl !== c) return
        setState({ status: 'connected', snapshot })
      } catch {
        if (!alive || ctrl !== c || c.signal.aborted) return
        setState((s) => ({ status: 'unreachable', snapshot: s.snapshot }))
      }
      schedule()
    }
    const onVisibility = () => {
      if (!alive) return
      if (hidden()) clearTimeout(timer)
      else void tick()
    }
    document.addEventListener('visibilitychange', onVisibility)
    void tick()
    return () => {
      alive = false
      clearTimeout(timer)
      ctrl?.abort()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  return state
}
