import { KNOWLEDGE_GRAPH, RUN_ID } from '../nexus-story'
import { ScreenBar } from './ScreenBar'
import { clamp01, visibleCount, type ViewProps } from './util'

export function KnowledgeView({ progress }: ViewProps) {
  const { nodes, edges } = KNOWLEDGE_GRAPH
  const shownNodes = visibleCount(progress, nodes.length)
  const shownEdges = visibleCount(clamp01((progress - 0.2) / 0.8), edges.length)
  return (
    <>
      <ScreenBar title="Knowledge" meta={`${RUN_ID} · mapping`} />
      <svg className="graph" viewBox="24 8 266 128" aria-hidden="true">
        {edges.slice(0, shownEdges).map(([a, b]) =>
          a < shownNodes && b < shownNodes ? (
            <line key={`${a}-${b}`} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
          ) : null,
        )}
        {nodes.slice(0, shownNodes).map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={4} />
            <text x={node.x + 6} y={node.y + 2.5}>
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </>
  )
}
