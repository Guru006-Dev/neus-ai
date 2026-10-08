import { agentName } from '../data/agents'
import { isTerminal } from '../data/normalize'
import type { AgentId, Run } from '../data/types'
import { RawOutput } from '../outputs/RawOutput'
import { EmptyState } from '../ui/EmptyState'
import { Tabs } from '../ui/Tabs'
import { defaultOutput, outputAgents } from './derive'

export function OutputPanel({ run, selected, onSelect }: { run: Run; selected: AgentId | null; onSelect: (id: AgentId) => void }) {
  const ids = outputAgents(run)
  const current = selected ?? defaultOutput(run)
  const missing = isTerminal(run.status) || run.detail === 'stored' ? 'Not produced in this run' : 'No output yet'
  const output = current ? run.outputs[current] : undefined
  return (
    <section className="nx-panel nx-output" id="run-output" aria-labelledby="run-output-title">
      <header className="nx-panel__head">
        <h2 id="run-output-title" className="nx-eyebrow">Output{current ? ` · ${agentName(current)}` : ''}</h2>
      </header>
      {ids.length > 0 && (
        <Tabs label="Outputs" items={ids.map((id) => ({ id, label: agentName(id) }))} value={current ?? ''} onChange={(id) => onSelect(id as AgentId)} />
      )}
      {current && output ? (
        <div role="tabpanel" id={`panel-${current}`} aria-labelledby={`tab-${current}`} tabIndex={0} className="nx-output__body" key={current}>
          <RawOutput raw={output.raw} />
        </div>
      ) : (
        <div className="nx-output__body">
          <EmptyState title={current ? `${agentName(current)}: ${missing}` : missing} body={current ? 'This agent has not reported output.' : 'Outputs appear here as agents finish.'} />
        </div>
      )}
    </section>
  )
}
