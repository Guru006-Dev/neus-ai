import type { AgentOutput } from '../data/types'
import { layoutGraph } from './graphLayout'
import { RawOutput } from './RawOutput'

const SIZE = 360

export function KnowledgeOutput({ output }: { output: Extract<AgentOutput, { agent: 'knowledge' }>; runId: string }) {
  const nodes = Array.isArray(output.nodes) ? output.nodes : []
  const edges = Array.isArray(output.edges) ? output.edges : []
  const pos = layoutGraph(nodes, edges, SIZE)
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  return (
    <div className="nx-out">
      {nodes.length > 0 && (
        <>
          <svg className="nx-graph" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Knowledge graph: ${nodes.length} nodes, ${edges.length} edges`}>
            {edges.map((e, i) => {
              const a = index.get(e.source), b = index.get(e.target)
              if (a === undefined || b === undefined) return null
              return <line key={i} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} stroke="var(--nx-grey-500)" strokeWidth={0.75} />
            })}
            {nodes.map((n, i) => (
              <g key={`${n.id}-${i}`}>
                <circle cx={pos[i].x} cy={pos[i].y} r={n.id === 'root' ? 5 : 3} fill="var(--nx-text)" />
                <text x={pos[i].x} y={pos[i].y + (n.id === 'root' ? 16 : 13)} textAnchor="middle" fontSize={11} fill="var(--nx-grey-300)">{n.label}</text>
              </g>
            ))}
          </svg>
          <ul className="nx-out__list nx-graph__nodes" aria-label="Graph nodes">
            {nodes.map((n, i) => <li key={`${n.id}-${i}`}>{n.label} <span className="nx-muted">· {n.type}</span></li>)}
          </ul>
        </>
      )}
      {output.density && <p className="nx-muted">Graph density (reported): {output.density}</p>}
      <RawOutput raw={output.raw} />
    </div>
  )
}
