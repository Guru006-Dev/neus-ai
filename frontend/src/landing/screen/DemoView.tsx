import { DEMO, RUN_ID } from '../nexus-story'
import type { Vec3 } from '../timeline'
import { ScreenBar } from './ScreenBar'
import { pct, type ViewProps } from './util'

const VERTICES: readonly Vec3[] = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
]
const EDGES: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
]
const TILT = 0.45

function project([x, y, z]: Vec3, angle: number): [string, string] {
  const rx = x * Math.cos(angle) + z * Math.sin(angle)
  const rz = -x * Math.sin(angle) + z * Math.cos(angle)
  const ry = y * Math.cos(TILT) - rz * Math.sin(TILT)
  const depth = y * Math.sin(TILT) + rz * Math.cos(TILT)
  const s = 110 / (4 + depth)
  return [(100 + rx * s).toFixed(2), (60 - ry * s).toFixed(2)]
}

export function DemoView({ progress }: ViewProps) {
  const points = VERTICES.map((v) => project(v, progress * Math.PI * 1.5))
  const ready = progress >= 1
  return (
    <>
      <ScreenBar title="Demo" meta={`${RUN_ID} · ${ready ? 'ready' : 'rendering'}`} />
      <div className="preview">
        <div className="preview__stage">
          <svg className="wire" viewBox="0 0 200 120" aria-hidden="true">
            {EDGES.map(([a, b]) => (
              <line key={`${a}-${b}`} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} />
            ))}
          </svg>
        </div>
        <div className="artifact__row">
          <span>{DEMO.title}</span>
          <span className="muted">{ready ? DEMO.done : DEMO.pending}</span>
        </div>
        <div className="bar">
          <div className="bar__fill" style={{ width: pct(progress) }} />
        </div>
      </div>
    </>
  )
}
