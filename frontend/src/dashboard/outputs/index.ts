import type { JSX } from 'react'
import type { AgentId, AgentOutput } from '../data/types'
import { DemoOutput } from './DemoOutput'
import { DocumentationOutput } from './DocumentationOutput'
import { ExplorerOutput } from './ExplorerOutput'
import { KnowledgeOutput } from './KnowledgeOutput'
import { QAOutput } from './QAOutput'
import { ReleaseOutput } from './ReleaseOutput'

export const OUTPUT_RENDERERS: { [K in AgentId]: (p: { output: Extract<AgentOutput, { agent: K }>; runId: string }) => JSX.Element } = {
  explorer: ExplorerOutput,
  knowledge: KnowledgeOutput,
  documentation: DocumentationOutput,
  qa: QAOutput,
  demo: DemoOutput,
  release: ReleaseOutput,
}
