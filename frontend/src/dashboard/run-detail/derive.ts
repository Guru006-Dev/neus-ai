// Pure text and selection rules for Run Detail, kept apart from components for fast refresh and tests
import { AGENT_ORDER, agentName } from '../data/agents'
import { isTerminal } from '../data/normalize'
import type { AgentId, Run } from '../data/types'
import { STATUS_UI } from '../ui/status'

/** Number of agents that actually had a task (or, for stored detail, an output) in this run. */
export const agentsRan = (run: Run) => run.agents.filter((a) => a.state !== 'not-in-run' && a.state !== 'not-started').length

export function bandText(run: Run): string {
  switch (run.status) {
    case 'queued':
      return 'Queued: waiting for a worker'
    case 'waiting':
    case 'running':
      return run.activeAgent ? `Running · ${agentName(run.activeAgent)} in progress` : 'Running · starting the next agent'
    case 'completed': {
      const k = agentsRan(run)
      return `Complete · ${k} ${k === 1 ? 'agent' : 'agents'} ran`
    }
    case 'failed': {
      const failed = run.agents.find((a) => a.state === 'failed')
      return failed ? `Failed at ${failed.name}` : 'Failed'
    }
    case 'cancelled':
      return 'Cancelled'
  }
}

export const outputAgents = (run: Run): AgentId[] => AGENT_ORDER.filter((id) => run.outputs[id])

/** The most recently completed agent that has output; ties go to the later agent in product order. */
export function defaultOutput(run: Run): AgentId | null {
  const ids = outputAgents(run)
  let best: AgentId | null = null
  let bestAt = -Infinity
  for (const id of ids) {
    const a = run.agents.find((x) => x.id === id)
    if (a?.state !== 'completed') continue
    const at = a.endedAt?.getTime() ?? -1
    if (at >= bestAt) { best = id; bestAt = at }
  }
  return best ?? ids[ids.length - 1] ?? null
}

export function runMapLabel(run: Run): string {
  return `Run map: ${run.agents.map((a) => `${a.name} ${STATUS_UI[a.state].label.toLowerCase()}`).join(', ')}`
}

/** Only infrequent transitions are announced: an agent completing or failing, and the run ending. */
export function announcement(prev: Run, next: Run): string {
  if (prev.id !== next.id) return ''
  const msgs: string[] = []
  for (const a of next.agents) {
    const before = prev.agents.find((p) => p.id === a.id)?.state
    if ((a.state === 'completed' || a.state === 'failed') && before !== a.state) msgs.push(`${a.name} ${STATUS_UI[a.state].label.toLowerCase()}`)
  }
  if (!isTerminal(prev.status) && isTerminal(next.status)) msgs.push(`Run ${STATUS_UI[next.status].label.toLowerCase()}`)
  return msgs.length ? `${msgs.join('. ')}.` : ''
}
