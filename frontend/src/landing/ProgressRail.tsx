import { AGENTS } from './nexus-story'
import type { AgentStatus } from './timeline'

const STATUS_TEXT: Record<AgentStatus, string> = { idle: 'queued', active: 'working', done: 'done' }

export function ProgressRail({ statuses }: { statuses: readonly AgentStatus[] }) {
  return (
    <nav className="rail" aria-label="Pipeline progress">
      <ol>
        {AGENTS.map((agent, i) => {
          const status = statuses[i]
          return (
            <li
              key={agent.id}
              className="rail__item"
              data-status={status}
              aria-current={status === 'active' ? 'step' : undefined}
            >
              <span className="rail__dot" aria-hidden="true" />
              <span className="rail__name">{agent.name}</span>
              <span className="sr-only">{`, ${STATUS_TEXT[status]}`}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
