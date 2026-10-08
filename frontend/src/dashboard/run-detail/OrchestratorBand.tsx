import type { Run } from '../data/types'
import { bandText } from './derive'

const ACTIVE = new Set(['queued', 'waiting', 'running'])

export function OrchestratorBand({ run, reconnecting }: { run: Run; reconnecting: boolean }) {
  const active = ACTIVE.has(run.status) && run.detail === 'live'
  return (
    <section className="nx-band" aria-labelledby="band-title" data-status={run.status}>
      <h2 id="band-title" className="nx-eyebrow">Orchestrator</h2>
      <p className="nx-band__text">{bandText(run)}</p>
      {active && <p className="nx-band__meta">{reconnecting ? 'Reconnecting…' : 'Updating every 1.5 s'}</p>}
    </section>
  )
}
