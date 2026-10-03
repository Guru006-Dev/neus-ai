import { STATUS_UI, type AgentState } from './status'

export function StatusGlyph({ state }: { state: AgentState }) {
  const s = STATUS_UI[state]
  return <span className="nx-glyph" data-tone={s.tone} aria-hidden="true">{s.glyph}</span>
}

export function StatusPill({ state }: { state: AgentState }) {
  return (
    <span className="nx-pill" data-tone={STATUS_UI[state].tone}>
      <StatusGlyph state={state} />
      {STATUS_UI[state].label}
    </span>
  )
}
