import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../data/client'
import { getRun } from '../data/workflows'
import { nextPollDelay, reduceRunView, type RunView } from './lifecycle'

const LOADING: RunView = { kind: 'loading' }

export function useRun(id: string): { view: RunView; retry: () => void } {
  const [nonce, setNonce] = useState(0)
  // The view is keyed by the subscription it belongs to, so a render for a new id
  // (or after retry) can never show a view that was produced for another one.
  const key = `${id}\u0000${nonce}`
  const [state, setState] = useState<{ key: string; view: RunView }>({ key, view: LOADING })
  useEffect(() => {
    let alive = true
    let failures = 0
    let seq = 0 // generation of the latest request; older completions are ignored
    let view: RunView = LOADING
    let timer: ReturnType<typeof setTimeout> | undefined
    let ctrl: AbortController | undefined
    const publish = (next: RunView) => {
      view = next
      setState({ key, view: next })
    }
    const schedule = () => {
      clearTimeout(timer)
      const delay = nextPollDelay(view, failures, document.visibilityState === 'hidden')
      if (delay !== null) timer = setTimeout(() => void tick(), delay)
    }
    const tick = async () => {
      clearTimeout(timer)
      ctrl?.abort()
      const mine = ++seq
      const c = new AbortController()
      ctrl = c
      try {
        const run = await getRun(id, c.signal)
        if (!alive || mine !== seq) return
        failures = 0
        publish(reduceRunView(view, { type: 'loaded', run }))
      } catch (e) {
        if (!alive || mine !== seq) return
        const error = e instanceof ApiError ? e : new ApiError('bad-response', String(e))
        if (error.kind !== 'aborted') failures++
        publish(reduceRunView(view, { type: 'error', error }))
      }
      schedule()
    }
    const onVisibility = () => {
      if (!alive) return
      if (document.visibilityState !== 'visible') clearTimeout(timer)
      else if (nextPollDelay(view, failures, false) !== null) void tick()
    }
    document.addEventListener('visibilitychange', onVisibility)
    void tick()
    return () => {
      alive = false
      clearTimeout(timer)
      ctrl?.abort()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [id, nonce, key])
  return { view: state.key === key ? state.view : LOADING, retry: useCallback(() => setNonce((n) => n + 1), []) }
}
