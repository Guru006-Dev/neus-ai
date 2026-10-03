import { AGENTS, GOAL, RUN_ID } from '../nexus-story'
import { ScreenBar } from './ScreenBar'
import { assignedCount } from '../timeline'
import { GLYPH, type ViewProps } from './util'

const CALL_GOAL = `"${GOAL.slice(0, 36)}…"`

export function OrchestratorView({ progress }: ViewProps) {
  const assigned = assignedCount(progress)
  const ready = assigned === AGENTS.length
  return (
    <>
      <ScreenBar title="Orchestrator" meta={`${RUN_ID} · ${ready ? 'scheduled' : 'planning'}`} />
      <pre className="code">
        <span className="code__fn">orchestrator.submit_workflow</span>
        {'({"goal": '}
        <span className="code__str">{CALL_GOAL}</span>
        {'}, user_id='}
        <span className="code__str">{'"landing"'}</span>
        {')'}
      </pre>
      <p className="muted">{ready ? 'Plan ready. Six agents assigned.' : 'Planning task…'}</p>
      <ul className="rows">
        {AGENTS.map((agent, i) => {
          const state = i < assigned ? 'done' : 'idle'
          return (
            <li key={agent.id} data-state={state}>
              <span className="glyph">{GLYPH[state]}</span>
              <span className="rows__main">{agent.name}</span>
              <span className="rows__meta">{state === 'done' ? 'assigned' : ''}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}
