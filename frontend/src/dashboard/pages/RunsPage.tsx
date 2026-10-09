import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import type { LocalRunEntry } from '../data/localRuns'
import { useLocalRuns } from '../run/useLocalRuns'
import { isRunId } from '../run/runId'
import { useRunStatuses, type Lookup } from '../run/useRunStatuses'
import { useBreadcrumb } from '../shell/breadcrumb'
import { Button } from '../ui/Button'
import { DataRows, type Column } from '../ui/DataRows'
import { EmptyState } from '../ui/EmptyState'
import { Panel } from '../ui/Panel'
import { STATUS_UI } from '../ui/status'
import { StatusGlyph } from '../ui/StatusGlyph'

const CRUMBS = [{ label: 'Runs' }]

function StatusCell({ lookup }: { lookup: Lookup | undefined }) {
  if (!lookup || lookup.kind === 'loading') return <span className="nx-muted">Checking…</span>
  if (lookup.kind === 'missing') return <span className="nx-muted">Not on backend</span>
  if (lookup.kind === 'unknown') return <span className="nx-muted">Status unavailable</span>
  return <><StatusGlyph state={lookup.status} /> {STATUS_UI[lookup.status].label}</>
}

const startedFmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })
const started = (iso: string) => { const t = Date.parse(iso); return Number.isNaN(t) ? '' : startedFmt.format(t) }

export default function RunsPage() {
  useBreadcrumb(CRUMBS)
  const runs = useLocalRuns()
  const statuses = useRunStatuses(runs)
  const navigate = useNavigate()
  const [id, setId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const columns: Column<LocalRunEntry>[] = [
    { key: 'goal', header: 'Run', primary: true, cell: (r) => r.goal },
    { key: 'status', header: 'Status', cell: (r) => <StatusCell lookup={statuses[r.id]} /> },
    { key: 'id', header: 'Run ID', cell: (r) => <code>{r.id}</code> },
    { key: 'started', header: 'Started', cell: (r) => started(r.submittedAt) },
  ]

  const open = (e: FormEvent) => {
    e.preventDefault()
    const v = id.trim()
    if (!isRunId(v)) {
      setError('Enter a run ID like wf-abc123 (lowercase letters and digits after "wf-").')
      return
    }
    setError(null)
    void navigate(`/dashboard/runs/${v}`)
  }

  return (
    <>
      <h1 className="nx-h1">Runs</h1>
      <p className="nx-muted">Started from this browser. NEXUS doesn't list runs across browsers yet.</p>
      <Panel id="runs-table">
        {runs.length === 0 ? (
          <EmptyState
            title="No runs from this browser yet."
            body="Describe a goal on the overview and NEXUS will start a run."
            action={<Link to="/dashboard" className="nx-btn nx-btn--primary">Start a run</Link>}
          />
        ) : (
          <DataRows
            caption="Runs started from this browser"
            columns={columns}
            rows={runs}
            rowKey={(r) => r.id}
            rowHref={(r) => `/dashboard/runs/${r.id}`}
          />
        )}
      </Panel>
      <Panel id="open-by-id" title="Open a run by ID">
        <form className="nx-goal" onSubmit={open} noValidate>
          <label htmlFor="open-run-id" className="nx-eyebrow">Run ID</label>
          <input
            id="open-run-id"
            className="nx-goal__input"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="wf-…"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'open-run-error' : undefined}
          />
          {error && <p id="open-run-error" role="alert" className="nx-goal__error">{error}</p>}
          <div><Button type="submit" variant="primary">Open</Button></div>
        </form>
      </Panel>
    </>
  )
}
