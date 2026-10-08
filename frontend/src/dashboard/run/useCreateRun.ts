import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../data/client'
import { localRuns } from '../data/localRuns'
import { createRun } from '../data/workflows'

export function describeCreateError(e: unknown): string {
  if (e instanceof ApiError && e.kind === 'unreachable') {
    return "NEXUS couldn't reach the backend. Check that it is running, then try again. Your goal is kept."
  }
  return 'The backend did not accept this goal. Try again in a moment. Your goal is kept.'
}

export function useCreateRun(): { submit: (goal: string) => Promise<void>; pending: boolean; error: string | null } {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const submit = useCallback(async (goal: string) => {
    const g = goal.trim()
    if (!g || inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      const { id } = await createRun(g)
      localRuns.add({ id, goal: g, submittedAt: new Date().toISOString() })
      navigate('/dashboard/runs/' + id)
    } catch (e) {
      setError(describeCreateError(e))
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }, [navigate])
  return { submit, pending, error }
}
