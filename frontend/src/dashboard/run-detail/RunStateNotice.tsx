import { Link, useNavigate } from 'react-router'
import { API_BASE } from '../data/client'
import { localRuns } from '../data/localRuns'
import type { RunView } from '../run/lifecycle'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Skeleton } from '../ui/Skeleton'
import { AgentList } from './AgentList'

export const NOT_FOUND = "This run isn't on the backend. It may have been lost when the backend restarted; in-progress runs are kept in memory."
export const DEGRADED = "Showing saved results. Step-by-step detail isn't available after a backend restart."
export const UNREACHABLE = "Can't reach the NEXUS backend."

/** The notice for view states that need one; failed runs are explained by the band and pill instead. */
export function RunStateNotice({ id, view, retry }: { id: string; view: RunView; retry: () => void }) {
  const navigate = useNavigate()
  switch (view.kind) {
    case 'loading':
      return <Skeleton lines={4} label="Loading run…" />
    case 'not-found':
      return (
        <div className="nx-notice-stack">
          <EmptyState
            title="Run not found"
            body={NOT_FOUND}
            action={
              <div className="nx-actions">
                <Button onClick={() => { localRuns.remove(id); void navigate('/dashboard/runs') }}>Remove from this browser</Button>
                <Link to="/dashboard/runs" className="nx-btn nx-btn--ghost">Back to runs</Link>
              </div>
            }
          />
          {view.lastRun && (
            <section className="nx-lastknown" aria-labelledby="last-known-title">
              <h2 id="last-known-title" className="nx-eyebrow">Last known state</h2>
              <AgentList agents={view.lastRun.agents} />
            </section>
          )}
        </div>
      )
    case 'degraded':
      return <p className="nx-notice">{DEGRADED}</p>
    case 'unreachable':
      return (
        <EmptyState
          tone="error"
          title={UNREACHABLE}
          body={`Tried ${API_BASE || (typeof window === 'undefined' ? 'this origin' : window.location.origin)}. Check that the backend is running, then retry.`}
          action={<Button onClick={retry}>Retry</Button>}
        />
      )
    default:
      return null
  }
}
