import { MARK_STROKE, N_NODES, N_POINTS, NODE_HOLE_RADIUS, NODE_RADIUS } from './brand'

const N_PATH = `M${N_POINTS.map(([x, y]) => `${x} ${y}`).join('L')}`

const WORDMARK = [
  'M56 29V11l14 18V11',
  'M90 11H78v18h12M78 20h10',
  'M97 11l16 18M113 11L97 29',
  'M120 11v11a7 7 0 0 0 14 0V11',
  'M155 13.6C153.6 11.9 151.4 11 148.6 11c-4 0-6.7 2-6.7 4.8 0 6.2 13.4 2.7 13.4 8.5 0 3-2.8 4.7-6.9 4.7-3.3 0-5.8-1-7.4-3',
]

function Mark() {
  return (
    <>
      <path d={N_PATH} fill="none" stroke="currentColor" strokeWidth={MARK_STROKE} strokeLinejoin="round" strokeLinecap="round" />
      {N_NODES.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={NODE_RADIUS} fill="currentColor" />
          <circle cx={x} cy={y} r={NODE_HOLE_RADIUS} fill="var(--nx-bg, #080808)" />
        </g>
      ))}
    </>
  )
}

export function NexusLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 40" role="img" aria-label="NEXUS">
      <Mark />
      <g fill="none" stroke="currentColor" strokeWidth={2.6} strokeMiterlimit={2.5}>
        {WORDMARK.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}

export function NexusMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" role="img" aria-label="NEXUS">
      <Mark />
    </svg>
  )
}
