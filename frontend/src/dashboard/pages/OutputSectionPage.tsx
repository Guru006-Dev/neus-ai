import { Link } from 'react-router'
import type { AgentId } from '../data/types'
import { useLatestOutput } from '../run/useLatestOutput'
import { useBreadcrumb } from '../shell/breadcrumb'
import { EmptyState } from '../ui/EmptyState'

export type OutputKind = 'knowledge' | 'documentation' | 'qa' | 'demos' | 'releases'

const SECTIONS: Record<OutputKind, { label: string; agent: AgentId }> = {
  knowledge: { label: 'Knowledge', agent: 'knowledge' },
  documentation: { label: 'Documentation', agent: 'documentation' },
  qa: { label: 'QA', agent: 'qa' },
  demos: { label: 'Demos', agent: 'demo' },
  releases: { label: 'Releases', agent: 'release' },
}

export default function OutputSectionPage({ kind }: { kind: OutputKind }) {
  const { label, agent } = SECTIONS[kind]
  useBreadcrumb([{ label }])
  const latest = useLatestOutput(agent)
  const action = latest.state === 'found'
    ? <Link to={`/dashboard/runs/${latest.runId}#${agent}`} className="nx-btn nx-btn--primary">Open latest {label}</Link>
    : latest.state === 'loading'
      ? undefined
      : <Link to="/dashboard" className="nx-btn nx-btn--primary">Start a run</Link>
  return (
    <>
      <h1 className="nx-h1">{label}</h1>
      <EmptyState
        title="Backend support needed"
        body={`${label} across runs needs a run-listing endpoint (GET /workflows). Until then, each run's ${label} output is on its run page.`}
        action={action}
      />
    </>
  )
}
