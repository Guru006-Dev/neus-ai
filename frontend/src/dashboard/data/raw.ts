// src/dashboard/data/raw.ts: shapes as returned by backend/main.py; do not add fields that aren't recorded
export const RAW_STATUSES = ['QUEUED', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const
export type RawStatus = (typeof RAW_STATUSES)[number]
export type RawAgentName = 'explorer' | 'knowledge_graph' | 'documentation' | 'qa' | 'demo' | 'release'

/** POST /workflows: recorded status is always the literal "SUBMITTED" (not a RawStatus). */
export interface RawCreateRun { workflow_id: string; status: 'SUBMITTED' }
/** FastAPI error body, e.g. the recorded 404 `{ "detail": "Workflow not found" }`. */
export interface RawErrorBody { detail: string }
export interface RawTask {
  task_id: string; workflow_id: string; agent_name: RawAgentName; status: RawStatus; priority: number
  input_data: { goal?: string; context: Record<string, unknown> }
  output_data: Record<string, unknown>
  error_msg: string | null; retry_count: number; created_at: string; updated_at: string
}
export interface RawRunLive { workflow_id: string; user_id: string; goal: string; status: RawStatus; priority: number; context: Record<string, unknown>; tasks: RawTask[] }
/** GET /workflows/:id after a restart: the DB-stored shape, no user_id, priority or tasks. */
export interface RawRunStored { workflow_id: string; status: RawStatus; goal: string; context: Record<string, unknown> }
export type RawRun = RawRunLive | RawRunStored
export interface RawSystemStatus {
  jobs_summary: { workflows: Record<'running' | 'queued' | 'completed' | 'failed' | 'total', number>; tasks: Record<'running' | 'queued' | 'total', number> }
  concurrency: Record<string, { active: number; limit: number; available: number }>
  queues: Record<string, number>
  // `resources` exists in the response and is deliberately not typed: it is never read (Global Constraints).
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export const isRawRunLive = (v: unknown): v is RawRunLive => isObj(v) && typeof v.workflow_id === 'string' && Array.isArray(v.tasks)
export const isRawRunStored = (v: unknown): v is RawRunStored => isObj(v) && typeof v.workflow_id === 'string' && !('tasks' in v) && typeof v.goal === 'string'
