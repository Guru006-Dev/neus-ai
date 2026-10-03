export type RunStatus = 'queued' | 'waiting' | 'running' | 'completed' | 'failed' | 'cancelled'
export type AgentState = RunStatus | 'not-started' | 'not-in-run'
type Tone = 'idle' | 'active' | 'done' | 'error' | 'muted'

export const STATUS_UI: Record<AgentState, { glyph: string; label: string; tone: Tone }> = {
  queued: { glyph: '○', label: 'Queued', tone: 'idle' },
  waiting: { glyph: '○', label: 'Waiting', tone: 'idle' },
  running: { glyph: '●', label: 'Running', tone: 'active' },
  completed: { glyph: '✓', label: 'Complete', tone: 'done' },
  failed: { glyph: '✕', label: 'Failed', tone: 'error' },
  cancelled: { glyph: '–', label: 'Cancelled', tone: 'muted' },
  'not-started': { glyph: '○', label: 'Not started', tone: 'idle' },
  'not-in-run': { glyph: '–', label: 'Not in this run', tone: 'muted' },
}
