import type { AgentOutput } from '../data/types'
import { Pills } from './Pills'
import { RawOutput } from './RawOutput'

export function ReleaseOutput({ output }: { output: Extract<AgentOutput, { agent: 'release' }>; runId: string }) {
  return (
    <div className="nx-out">
      <dl className="nx-dl">
        {output.releaseId && <div><dt>Release</dt><dd>{output.releaseId}</dd></div>}
        {output.deploymentStatus && <div><dt>Deployment status</dt><dd>{output.deploymentStatus}</dd></div>}
        {output.qaPassRate && <div><dt>QA pass rate (reported)</dt><dd className="nx-muted">{output.qaPassRate}</dd></div>}
        {output.components && output.components.length > 0 && <div><dt>Components validated</dt><dd><Pills items={output.components} /></dd></div>}
        {output.summary && <div><dt>Summary</dt><dd>{output.summary}</dd></div>}
      </dl>
      <RawOutput raw={output.raw} />
    </div>
  )
}
