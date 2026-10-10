import type { AgentOutput } from '../data/types'
import { layoutGraph } from './graphLayout'
import { RawOutput } from './RawOutput'

const SIZE = 360
const FONT = 11
const ADVANCE = FONT * 0.62 // average glyph advance, kept generous so labels never reach the edge

/** Anchor a label towards the centre and shorten it to the room it has, so the SVG never clips it. */
function fitLabel(label: string, x: number): { text: string; anchor: 'start' | 'middle' | 'end' } {
  const c = SIZE / 2
  const anchor = Math.abs(x - c) < SIZE * 0.15 ? 'middle' : x < c ? 'start' : 'end'
  const room = anchor === 'middle' ? 2 * Math.min(x, SIZE - x) : anchor === 'start' ? SIZE - x : x
  const max = Math.max(4, Math.floor(room / ADVANCE))
  return { text: label.length > max ? `${label.slice(0, max - 1).trimEnd()}…` : label, anchor }
}

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
            {nodes.map((n, i) => {
              const { text, anchor } = fitLabel(n.label, pos[i].x)
              return (
                <g key={`${n.id}-${i}`}>
                  <title>{n.label}</title>
                  <circle cx={pos[i].x} cy={pos[i].y} r={n.id === 'root' ? 5 : 3} fill="var(--nx-text)" />
                  <text x={pos[i].x} y={pos[i].y + (n.id === 'root' ? 16 : 13)} textAnchor={anchor} fontSize={FONT} fill="var(--nx-grey-300)">{text}</text>
                </g>
              )
            })}
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
