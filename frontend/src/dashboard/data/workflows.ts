import { apiFetch, ApiError } from './client'
import { normalizeRun } from './normalize'
import type { RawCreateRun } from './raw'
import type { Run } from './types'

export async function createRun(goal: string, signal?: AbortSignal): Promise<{ id: string }> {
  const g = goal.trim()
  if (!g) throw new ApiError('bad-response', 'Goal is empty')
  const res = await apiFetch<RawCreateRun>('/workflows', { method: 'POST', body: JSON.stringify({ goal: g, user_id: 'dashboard' }), signal })
  if (typeof res?.workflow_id !== 'string') throw new ApiError('bad-response', 'Backend did not return a run id')
  return { id: res.workflow_id }
}
export const getRun = async (id: string, signal?: AbortSignal): Promise<Run> => normalizeRun(await apiFetch(`/workflows/${encodeURIComponent(id)}`, { signal }))
