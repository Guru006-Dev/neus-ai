import type { AgentOutput } from '../data/types'
import { renderMarkdown } from './markdown'
import { RawOutput } from './RawOutput'

export function DocumentationOutput({ output }: { output: Extract<AgentOutput, { agent: 'documentation' }>; runId: string }) {
  return (
    <div className="nx-out">
      {output.markdown && <article className="nx-prose">{renderMarkdown(output.markdown)}</article>}
      <RawOutput raw={output.raw} />
    </div>
  )
}
