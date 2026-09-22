export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

export interface AgentResult {
  name: string;
  status: AgentStatus;
  duration?: number;
  output?: string;
}

export interface RunState {
  runId: string | null;
  goal: string;
  status: 'idle' | 'running' | 'done' | 'error';
  agents: AgentResult[];
  elapsed: number;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  goal: string;
  status: 'done' | 'error';
  elapsed: number;
  timestamp: number;
  agents: AgentResult[];
}

export const AGENTS = ['Explorer', 'Knowledge', 'Docs', 'QA', 'Demo', 'Release'];

export type AgentIconKey = 'Explorer' | 'Knowledge' | 'Docs' | 'QA' | 'Demo' | 'Release';

export const AGENT_INFO: Record<string, { desc: string }> = {
  Explorer:  { desc: 'Crawls the product URL, extracts metadata, pricing, screenshots and feature lists.' },
  Knowledge: { desc: 'Builds a structured knowledge graph from raw Explorer data — competitors, use-cases, positioning.' },
  Docs:      { desc: 'Generates product documentation: README, API reference and onboarding guide drafts.' },
  QA:        { desc: 'Runs automated quality checks — broken links, missing metadata, content gaps and readability scores.' },
  Demo:      { desc: 'Produces a demo script, key talking points and suggested walkthrough flow for the product.' },
  Release:   { desc: 'Assembles the final release brief: changelog, go-to-market summary and launch checklist.' },
};

export function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
