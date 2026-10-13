import { useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { useLocalRuns } from '../run/useLocalRuns'
import { useCreateRun } from '../run/useCreateRun'
import { useSystemStatus } from '../run/useSystemStatus'
import { RecentRunRow } from '../run/RecentRunRow'
import { useBreadcrumb } from '../shell/breadcrumb'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Panel } from '../ui/Panel'

const CRUMBS = [{ label: 'Overview' }]

export default function OverviewPage() {
  useBreadcrumb(CRUMBS)
  const [goal, setGoal] = useState('')
  const { submit, pending, error } = useCreateRun()
  const runs = useLocalRuns()
  const { status, snapshot } = useSystemStatus()
  const canRun = goal.trim().length > 0 && !pending
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (canRun) void submit(goal)
    }
  }
  const w = snapshot?.workflows

  return (
    <>
      <h1 className="nx-h1">What should NEXUS work on?</h1>
      <form
        className="nx-goal"
        onSubmit={(e) => {
          e.preventDefault()
          if (canRun) void submit(goal)
        }}
      >
        <label htmlFor="goal" className="nx-eyebrow">Goal</label>
        <textarea
          id="goal"
          className="nx-goal__input"
          rows={4}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby={error ? 'goal-hint goal-error' : 'goal-hint'}
          aria-invalid={error ? true : undefined}
        />
        <p id="goal-hint" className="nx-muted">NEXUS chooses which agents to run from your goal.</p>
        {error && <p id="goal-error" role="alert" className="nx-goal__error">{error}</p>}
        <div>
          <Button type="submit" variant="primary" disabled={!canRun}>{pending ? 'Starting…' : 'Run →'}</Button>
        </div>
      </form>

      <Panel
        id="recent-runs"
        title="Recent runs · started from this browser"
        actions={runs.length > 0 ? <Link to="/dashboard/runs">View all</Link> : undefined}
      >
        {runs.length === 0 ? (
          <EmptyState title="No runs from this browser yet." body="Describe a goal above and NEXUS will start a run." />
        ) : (
          <ul className="nx-recent-list">
            {runs.slice(0, 5).map((r) => <RecentRunRow key={r.id} entry={r} />)}
          </ul>
        )}
      </Panel>

      <p className="nx-sysline">
        Workflows since backend start:{' '}
        {w
          ? `${w.running} running · ${w.queued} queued · ${w.completed} complete · ${w.failed} failed`
          : status === 'unreachable' ? 'unavailable while the backend is unreachable' : snapshot ? 'unavailable' : 'checking…'}
        {' · '}<Link to="/dashboard/agents">Agents</Link>
      </p>
    </>
  )
}
