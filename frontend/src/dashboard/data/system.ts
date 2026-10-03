// Resources (CPU/memory) are never read.
import { AGENT_INTERNAL, AGENT_ORDER } from './agents'
import { apiFetch } from './client'
import type { RawSystemStatus } from './raw'
import type { SystemSnapshot } from './types'

export async function getSystemStatus(signal?: AbortSignal): Promise<SystemSnapshot> {
  const r = await apiFetch<RawSystemStatus>('/system/status', { signal })
  const w = r.jobs_summary?.workflows
  return {
    workflows: { running: w?.running ?? 0, queued: w?.queued ?? 0, completed: w?.completed ?? 0, failed: w?.failed ?? 0 },
    agents: AGENT_ORDER.map((id) => { const c = r.concurrency?.[AGENT_INTERNAL[id]]; return { id, active: c?.active ?? 0, limit: c?.limit ?? 0, queued: r.queues?.[`agent_${AGENT_INTERNAL[id]}`] ?? 0 } }),
  }
}
