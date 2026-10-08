import { formatDuration } from '../data/time'
import type { Run } from '../data/types'
import { useLocalRuns } from '../run/useLocalRuns'
import { CopyButton } from '../ui/CopyButton'
import { StatusPill } from '../ui/StatusGlyph'

export const ELAPSED_DEFINITION = 'From the first agent being queued to the last agent finishing; excludes time waiting for the orchestrator.'

const isActive = (r: Run) => r.status === 'queued' || r.status === 'waiting' || r.status === 'running'

function clock(iso: string): string {
  const t = new Date(iso)
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * `run` is null before anything has loaded. `stale` marks a last-known run the backend no longer has:
 * its goal is still useful, but its status and elapsed time are not current, so they are left out.
 */
export function RunHeader({ run: loaded, id = loaded?.id ?? '', stale = false }: { run: Run | null; id?: string; stale?: boolean }) {
  const run = stale ? null : loaded
  const local = useLocalRuns().find((r) => r.id === id)
  const goal = loaded?.goal.trim()
  const started = local ? clock(local.submittedAt) : null
  return (
    <header className="nx-runhead">
      <div className="nx-runhead__top">
        <h1 className="nx-h1 nx-runhead__goal">{goal || `Run ${id}`}</h1>
        {run && <StatusPill state={run.status} />}
      </div>
      <p className="nx-runhead__meta">
        <span className="nx-runhead__id"><code className="nx-mono">{id}</code><CopyButton value={id} label="run ID" /></span>
        {local && <span>Started from this browser{started && ` ${started}`}</span>}
        {run && (
          <span className="nx-runhead__elapsed" title={ELAPSED_DEFINITION}>
            {isActive(run) ? 'running for' : 'elapsed'} <span className="nx-mono">{formatDuration(run.elapsedMs)}</span>*
            <span className="sr-only"> ({ELAPSED_DEFINITION})</span>
          </span>
        )}
      </p>
    </header>
  )
}
