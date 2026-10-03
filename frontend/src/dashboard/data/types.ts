import type { AgentState, RunStatus } from '../ui/status'

export type AgentId = 'explorer' | 'knowledge' | 'documentation' | 'qa' | 'demo' | 'release'
export type { RunStatus, AgentState } from '../ui/status'
export interface AgentError { summary: string; detail: string }
export interface AgentRun { id: AgentId; name: string; state: AgentState; queuedAt: Date | null; endedAt: Date | null; elapsedMs: number | null; retries: number; error: AgentError | null; summary: string | null }
export type AgentOutput =
  | { agent: 'explorer'; entity?: string; components?: string[]; dimensions?: string[]; insights?: string[]; reportedMetrics?: Record<string, string | number>; hasShowcase: boolean; raw: unknown }
  | { agent: 'knowledge'; nodes: { id: string; label: string; type: string }[]; edges: { source: string; target: string; relation: string }[]; density?: string; raw: unknown }
  | { agent: 'documentation'; markdown: string | null; raw: unknown }
  | { agent: 'qa'; reported: { total?: number; passed?: number; failed?: number; passRate?: string }; tests: { name: string; result: string; score?: string; detail?: string }[]; raw: unknown }
  | { agent: 'demo'; status?: string; generatedBy?: string; lineCount?: number; raw: unknown }
  | { agent: 'release'; releaseId?: string; deploymentStatus?: string; components?: string[]; qaPassRate?: string; summary?: string; raw: unknown }
export interface Run { id: string; goal: string; status: RunStatus; detail: 'live' | 'stored'; agents: AgentRun[]; outputs: Partial<Record<AgentId, AgentOutput>>; activeAgent: AgentId | null; elapsedMs: number | null }
export interface SystemSnapshot { workflows: { running: number; queued: number; completed: number; failed: number }; agents: { id: AgentId; active: number; limit: number; queued: number }[] }
