import type { AgentOutput } from '../data/types'
import { Disclosure } from '../ui/Disclosure'
import { Pills } from './Pills'
import { RawOutput } from './RawOutput'
import { Showcase } from './Showcase'

export function ExplorerOutput({ output, runId }: { output: Extract<AgentOutput, { agent: 'explorer' }>; runId: string }) {
  const metrics = Object.entries(output.reportedMetrics ?? {})
  return (
    <div className="nx-out">
      {output.entity && <h3 className="nx-out__title">{output.entity}</h3>}
      {output.components && output.components.length > 0 && <section><h4 className="nx-eyebrow">Components</h4><Pills items={output.components} /></section>}
      {output.dimensions && output.dimensions.length > 0 && <section><h4 className="nx-eyebrow">Dimensions</h4><ul className="nx-out__list">{output.dimensions.map((d, i) => <li key={i}>{d}</li>)}</ul></section>}
      {output.insights && output.insights.length > 0 && <section><h4 className="nx-eyebrow">Key insights</h4><ol className="nx-out__list">{output.insights.map((d, i) => <li key={i}>{d}</li>)}</ol></section>}
      {metrics.length > 0 && (
        <Disclosure summary="Reported by agent">
          <dl className="nx-dl nx-muted">{metrics.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl>
        </Disclosure>
      )}
      {output.hasShowcase && <Showcase runId={runId} kind="explorer_html" title="Explorer showcase" />}
      <RawOutput raw={output.raw} />
    </div>
  )
}
