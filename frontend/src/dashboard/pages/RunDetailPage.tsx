import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import type { AgentId, Run } from '../data/types'
import { AgentList } from '../run-detail/AgentList'
import { announcement, selectedFromHash } from '../run-detail/derive'
import { OrchestratorBand } from '../run-detail/OrchestratorBand'
import { OutputPanel } from '../run-detail/OutputPanel'
import { RunHeader } from '../run-detail/RunHeader'
import { RunMap } from '../run-detail/RunMap'
import { RunStateNotice } from '../run-detail/RunStateNotice'
import type { RunView } from '../run/lifecycle'
import { useRun } from '../run/useRun'
import { useBreadcrumb } from '../shell/breadcrumb'
import { useNavMode } from '../shell/useNavMode'
import { Panel } from '../ui/Panel'

const currentRun = (v: RunView): Run | null => ('run' in v ? v.run : null)
const crumb = (s: string) => (s.length > 48 ? `${s.slice(0, 47).trimEnd()}…` : s)

export default function RunDetailPage() {
  const { runId = '' } = useParams()
  const { view, retry } = useRun(runId)
  const run = currentRun(view)
  const lastRun = view.kind === 'not-found' || view.kind === 'unreachable' ? view.lastRun : null
  const headerRun = run ?? lastRun
  const vertical = useNavMode() === 'drawer'
  const location = useLocation()
  const navigate = useNavigate()

  useBreadcrumb([{ label: 'Runs', to: '/dashboard/runs' }, { label: crumb(headerRun?.goal.trim() || runId) }])

  const selected = selectedFromHash(location.hash)
  const select = (id: AgentId) => void navigate({ pathname: location.pathname, search: location.search, hash: id }, { replace: true })

  // The live region is written directly so that polls and first load never re-render or announce.
  const live = useRef<HTMLParagraphElement>(null)
  const prev = useRef<Run | null>(null)
  useEffect(() => {
    const before = prev.current
    prev.current = run
    if (!before || !run || !live.current) return
    const msg = announcement(before, run)
    if (msg) live.current.textContent = msg
  }, [run])

  return (
    <div className="nx-rundetail" aria-busy={view.kind === 'loading' || undefined}>
      <RunHeader run={headerRun} id={runId} stale={!run} />
      <RunStateNotice id={runId} view={view} retry={retry} />
      {run && (
        <>
          <OrchestratorBand run={run} reconnecting={view.kind === 'active' && view.reconnecting} />
          <div className="nx-rundetail__cols">
            <Panel id="run-agents" title="Agents">
              <AgentList agents={run.agents} selected={selected} onSelect={select} />
            </Panel>
            <OutputPanel run={run} selected={selected} onSelect={select} />
          </div>
          <RunMap run={run} vertical={vertical} />
        </>
      )}
      <p aria-live="polite" className="sr-only" ref={live} />
    </div>
  )
}
