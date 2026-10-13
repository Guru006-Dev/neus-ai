// Resources (CPU/memory) are never read.
import { AGENT_INTERNAL, AGENT_ORDER } from './agents'
import { apiFetch } from './client'
import type { RawSystemStatus } from './raw'
import type { SystemSnapshot } from './types'

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export async function getSystemStatus(signal?: AbortSignal): Promise<SystemSnapshot> {
  const r = await apiFetch<Partial<RawSystemStatus>>('/system/status', { signal })
  const w = r.jobs_summary?.workflows
  const counts = { running: num(w?.running), queued: num(w?.queued), completed: num(w?.completed), failed: num(w?.failed) }
  const workflows = counts.running !== null && counts.queued !== null && counts.completed !== null && counts.failed !== null
    ? { running: counts.running, queued: counts.queued, completed: counts.completed, failed: counts.failed }
    : null
  return {
    workflows,
    agents: AGENT_ORDER.map((id) => {
      const c = r.concurrency?.[AGENT_INTERNAL[id]]
      return { id, active: num(c?.active), limit: num(c?.limit), queued: num(r.queues?.[`agent_${AGENT_INTERNAL[id]}`]) }
    }),
  }
}
