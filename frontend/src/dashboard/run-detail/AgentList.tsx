import { formatDuration } from '../data/time'
import type { AgentId, AgentRun } from '../data/types'
import { Disclosure } from '../ui/Disclosure'
import { STATUS_UI } from '../ui/status'
import { StatusGlyph } from '../ui/StatusGlyph'

function elapsed(a: AgentRun): string | null {
  if (a.state === 'running') return a.elapsedMs === null ? 'running…' : `running for ${formatDuration(a.elapsedMs)}`
  if (a.state === 'not-started' || a.state === 'not-in-run') return null
  return a.elapsedMs === null ? null : formatDuration(a.elapsedMs)
}

export function AgentList({ agents, selected, onSelect, label = 'Agents' }: { agents: AgentRun[]; selected?: AgentId | null; onSelect?: (id: AgentId) => void; label?: string }) {
  return (
    <ol className="nx-agents" aria-label={label}>
      {agents.map((a) => {
        const time = elapsed(a)
        const head = (
          <>
            <span className="nx-agent__state"><StatusGlyph state={a.state} /><span className="nx-agent__label">{STATUS_UI[a.state].label}</span></span>
            <span className="nx-agent__name">{a.name}</span>
            {time && <span className="nx-agent__time nx-mono">{time}</span>}
          </>
        )
        return (
          <li key={a.id} className="nx-agent" data-state={a.state} aria-current={a.state === 'running' ? 'step' : undefined} data-selected={selected === a.id || undefined}>
            {onSelect ? (
              <button type="button" className="nx-agent__head" onClick={() => onSelect(a.id)} aria-controls="run-output">{head}</button>
            ) : (
              <div className="nx-agent__head">{head}</div>
            )}
            {a.summary && <p className="nx-agent__summary">{a.summary}</p>}
            {a.retries > 0 && <p className="nx-agent__retries">retried ×{a.retries}</p>}
            {a.error && (
              <div className="nx-agent__error">
                <p>{a.error.summary}</p>
                <Disclosure summary="Details"><pre>{a.error.detail}</pre></Disclosure>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
