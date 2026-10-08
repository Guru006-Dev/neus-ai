// The scheduler runs the plan strictly in order, so the map is a chain: goal → six agents → N.
import type { Run } from '../data/types'
import { STATUS_UI } from '../ui/status'
import { runMapLabel } from './derive'

const N_MUTED = '#666F76'
const N_DONE = '#E1E5E5'

interface Node { key: string; label: string; state?: string; tone?: string }

export function RunMap({ run, vertical }: { run: Run; vertical: boolean }) {
  const nodes: Node[] = [
    { key: 'goal', label: 'Goal' },
    ...run.agents.map((a) => ({ key: a.id, label: a.name, state: a.state, tone: STATUS_UI[a.state].tone })),
    { key: 'n', label: '' },
  ]
  const step = vertical ? 36 : 84
  const pad = vertical ? 18 : 24
  const pos = (i: number) => (vertical ? { x: 12, y: pad + i * step } : { x: pad + i * step, y: 14 })
  const width = vertical ? 200 : pad * 2 + step * (nodes.length - 1)
  const height = vertical ? pad * 2 + step * (nodes.length - 1) : 44
  const nFill = run.status === 'completed' ? N_DONE : N_MUTED

  return (
    <figure className="nx-runmap" data-orientation={vertical ? 'vertical' : 'horizontal'}>
      <figcaption className="nx-eyebrow">Run map</figcaption>
      <svg role="img" aria-label={runMapLabel(run)} viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="nx-runmap__svg">
        {nodes.slice(1).map((n, i) => {
          const a = pos(i)
          const b = pos(i + 1)
          return <line key={`e-${n.key}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="nx-runmap__edge" />
        })}
        {nodes.map((n, i) => {
          const { x, y } = pos(i)
          const tx = vertical ? x + 16 : x
          const ty = vertical ? y + 4 : y + 24
          const anchor = vertical ? 'start' : 'middle'
          if (n.key === 'n') {
            return (
              <text key="n" data-node="n" x={x} y={y + 5} textAnchor="middle" fill={nFill} className="nx-runmap__n">N</text>
            )
          }
          return (
            <g key={n.key} data-node={n.key} data-state={n.state} data-tone={n.tone} className="nx-runmap__node">
              <circle cx={x} cy={y} r={n.key === 'goal' ? 3 : 5} />
              <text x={tx} y={ty} textAnchor={anchor}>{n.label}</text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
