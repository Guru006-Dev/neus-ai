import { AGENTS } from '../../landing/nexus-story'
import type { AgentId } from './types'
import type { RawAgentName } from './raw'

export const AGENT_ORDER: AgentId[] = ['explorer', 'knowledge', 'documentation', 'qa', 'demo', 'release']
export const AGENT_INTERNAL: Record<AgentId, RawAgentName> = { explorer: 'explorer', knowledge: 'knowledge_graph', documentation: 'documentation', qa: 'qa', demo: 'demo', release: 'release' }
export const AGENT_CONTEXT_KEY: Record<AgentId, string> = { explorer: 'explorer_output', knowledge: 'knowledge_graph_output', documentation: 'documentation_output', qa: 'qa_output', demo: 'demo_output', release: 'release_output' }
const BY_INTERNAL = new Map(Object.entries(AGENT_INTERNAL).map(([id, raw]) => [raw, id as AgentId]))
export const fromInternal = (name: string): AgentId | null => BY_INTERNAL.get(name.toLowerCase() as RawAgentName) ?? null
export const agentName = (id: AgentId): string => AGENTS[AGENT_ORDER.indexOf(id)].name
export const agentPurpose = (id: AgentId): string => AGENTS[AGENT_ORDER.indexOf(id)].caption
