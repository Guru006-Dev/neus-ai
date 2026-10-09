import { AGENT_ORDER, agentName, agentPurpose } from '../data/agents'
import type { AgentId } from '../data/types'
import { useSystemStatus } from '../run/useSystemStatus'
import { useBreadcrumb } from '../shell/breadcrumb'
import { DataRows, type Column } from '../ui/DataRows'
import { Panel } from '../ui/Panel'

const CRUMBS = [{ label: 'Agents' }]

export default function AgentsPage() {
  useBreadcrumb(CRUMBS)
  const { status, snapshot } = useSystemStatus()
  const pool = (id: AgentId) => {
    const a = snapshot?.agents.find((x) => x.id === id)
    if (a) return `Live worker pool · ${a.active}/${a.limit} busy · ${a.queued} queued`
    return status === 'unreachable' ? 'Live worker pool · unavailable while the backend is unreachable' : 'Live worker pool · checking…'
  }
  const columns: Column<AgentId>[] = [
    { key: 'name', header: 'Agent', primary: true, cell: (id) => agentName(id) },
    { key: 'purpose', header: 'Purpose', cell: (id) => agentPurpose(id) },
    { key: 'pool', header: 'Pool', cell: (id) => pool(id) },
  ]
  return (
    <>
      <h1 className="nx-h1">Agents</h1>
      <Panel id="agents-table">
        <DataRows caption="NEXUS agents and their live worker pools" columns={columns} rows={AGENT_ORDER} rowKey={(id) => id} />
      </Panel>
      <p className="nx-muted">Per-agent history needs backend support.</p>
    </>
  )
}
