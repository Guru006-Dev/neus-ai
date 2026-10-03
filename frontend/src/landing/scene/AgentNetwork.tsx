import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { N_POINTS } from '../brand'
import { registerReporter } from '../debug'
import { AGENTS, metricText } from '../nexus-story'
import {
  agentProgress,
  agentStatus,
  connectionProgress,
  convergeStages,
  networkIntensity,
  ringState,
  smoothstep,
  tagReveal,
  tagScale,
} from '../timeline'
import { LINE_STARTS, TAG_POSITIONS, markPoint, screenPoint } from './constants'

const SEGMENTS = 48
const POINTS = SEGMENTS + 1
const RING_POINTS = 25
const LINE_COLOR = '#e1e5e5'

interface AgentLine {
  line: THREE.Line
  material: THREE.LineDashedMaterial
  from: THREE.Vector3[]
  to: THREE.Vector3[]
  baseDistances: Float32Array
}

function curvePoints(i: number): THREE.Vector3[] {
  const start = screenPoint(LINE_STARTS[i][0], LINE_STARTS[i][1])
  const end = new THREE.Vector3(...TAG_POSITIONS[i])
  const control = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.35, 0.3))
  return new THREE.QuadraticBezierCurve3(start, control, end).getPoints(SEGMENTS)
}

/** Line i settles onto half of one N stroke: three strokes split in halves give six lines. */
function markTargetPoints(i: number): THREE.Vector3[] {
  const stroke = Math.floor(i / 2)
  const half = i % 2
  const [ax, ay] = N_POINTS[stroke]
  const [bx, by] = N_POINTS[stroke + 1]
  return Array.from({ length: POINTS }, (_, k) => {
    const t = (half + k / SEGMENTS) / 2
    return markPoint(ax + (bx - ax) * t, ay + (by - ay) * t)
  })
}

function makeLine(i: number): AgentLine {
  const from = curvePoints(i)
  const geometry = new THREE.BufferGeometry().setFromPoints(from)
  const material = new THREE.LineDashedMaterial({
    color: LINE_COLOR,
    dashSize: 0.06,
    gapSize: 0.05,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const line = new THREE.Line(geometry, material)
  line.computeLineDistances()
  const distances = geometry.getAttribute('lineDistance') as THREE.BufferAttribute
  return { line, material, from, to: markTargetPoints(i), baseDistances: Float32Array.from(distances.array as ArrayLike<number>) }
}

function makeRing(i: number): THREE.Line {
  const a = new THREE.Vector3(...TAG_POSITIONS[i])
  const b = new THREE.Vector3(...TAG_POSITIONS[(i + 1) % TAG_POSITIONS.length])
  const points = Array.from({ length: RING_POINTS }, (_, k) => a.clone().lerp(b, k / (RING_POINTS - 1)))
  const material = new THREE.LineBasicMaterial({ color: LINE_COLOR, transparent: true, opacity: 0, depthWrite: false })
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material)
  line.geometry.setDrawRange(0, 0)
  return line
}

interface TagCache {
  status: string
  metric: string
  fade: string
  scale: string
}

export function AgentNetwork({
  progressRef,
  portal,
}: {
  progressRef: RefObject<number>
  portal: RefObject<HTMLElement | null>
}) {
  const lines = useMemo(() => AGENTS.map((_, i) => makeLine(i)), [])
  const rings = useMemo(() => AGENTS.map((_, i) => makeRing(i)), [])
  const tagRefs = useRef<(HTMLDivElement | null)[]>([])
  const morphCache = useRef(-1)
  const tagCache = useRef<TagCache[]>(AGENTS.map(() => ({ status: '', metric: '\u0000', fade: '', scale: '' })))

  useEffect(
    () => () => {
      for (const l of lines) {
        l.line.geometry.dispose()
        l.material.dispose()
      }
      for (const r of rings) {
        r.geometry.dispose()
        ;(r.material as THREE.Material).dispose()
      }
    },
    [lines, rings],
  )

  useFrame((state) => {
    const p = progressRef.current
    const stages = convergeStages(p)
    const morph = stages.morph
    const net = networkIntensity(p)
    const morphChanged = morph !== morphCache.current
    morphCache.current = morph

    lines.forEach((l, i) => {
      const geometry = l.line.geometry
      if (morphChanged) {
        const pos = geometry.getAttribute('position') as THREE.BufferAttribute
        for (let k = 0; k < POINTS; k++) {
          const a = l.from[k]
          const b = l.to[k]
          pos.setXYZ(k, a.x + (b.x - a.x) * morph, a.y + (b.y - a.y) * morph, a.z + (b.z - a.z) * morph)
        }
        pos.needsUpdate = true
      }
      const drawn = connectionProgress(p, i)
      geometry.setDrawRange(0, drawn >= 1 ? POINTS : Math.round(drawn * POINTS))
      if (agentStatus(p, i) === 'active') {
        // Flowing dash: shift line distances by the agent's own progress (deterministic in p).
        const dist = geometry.getAttribute('lineDistance') as THREE.BufferAttribute
        const shift = agentProgress(p, i) * 2
        for (let k = 0; k < POINTS; k++) dist.setX(k, l.baseDistances[k] - shift)
        dist.needsUpdate = true
        l.material.dashSize = 0.06
        l.material.gapSize = 0.05
        l.material.opacity = 0.75
      } else {
        l.material.dashSize = 1000
        l.material.gapSize = 0
        l.material.opacity = (0.35 + 0.5 * net) * stages.lines
      }
    })

    rings.forEach((ring, k) => {
      const { draw, opacity } = ringState(p, k)
      ring.geometry.setDrawRange(0, Math.round(draw * RING_POINTS))
      ;(ring.material as THREE.LineBasicMaterial).opacity = opacity
    })

    const tagsOut = 1 - smoothstep(stages.tags)
    const scale = tagScale(p, state.size.width / Math.max(1, state.size.height)).toFixed(3)
    let missing = false
    AGENTS.forEach((agent, i) => {
      const wrap = tagRefs.current[i]
      if (!wrap) {
        missing = true
        return
      }
      const cache = tagCache.current[i]
      const tag = wrap.firstElementChild as HTMLElement
      const status = agentStatus(p, i)
      if (status !== cache.status) {
        tag.dataset.status = status
        cache.status = status
      }
      const metric = metricText(agent, agentProgress(p, i))
      if (metric !== cache.metric) {
        ;(tag.lastElementChild as HTMLElement).textContent = metric
        cache.metric = metric
      }
      const fade = (tagReveal(p, i) * tagsOut).toFixed(3)
      if (fade !== cache.fade) {
        wrap.style.opacity = fade
        wrap.style.visibility = fade === '0.000' ? 'hidden' : 'visible'
        cache.fade = fade
      }
      if (scale !== cache.scale) {
        wrap.style.transform = `scale(${scale})`
        cache.scale = scale
      }
    })
    if (missing) state.invalidate() // Html portals mount asynchronously; render again once they exist
  })

  useEffect(
    () =>
      registerReporter('network', () => ({
        statuses: tagRefs.current.map((w) => (w?.firstElementChild as HTMLElement | null)?.dataset.status ?? null),
        metrics: tagRefs.current.map((w) => w?.firstElementChild?.lastElementChild?.textContent ?? null),
        tagFade: tagRefs.current.map((w) => w?.style.opacity ?? null),
        draws: lines.map((l) => l.line.geometry.drawRange.count),
        lineOpacity: lines.map((l) => l.material.opacity),
        rings: rings.map((r) => r.geometry.drawRange.count),
        ringOpacity: rings.map((r) => (r.material as THREE.LineBasicMaterial).opacity),
        tagScale: tagRefs.current.map((w) => w?.style.transform ?? null),
      })),
    [lines, rings],
  )

  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={AGENTS[i].id} object={l.line} />
      ))}
      {rings.map((r, i) => (
        <primitive key={`ring-${AGENTS[i].id}`} object={r} />
      ))}
      {AGENTS.map((agent, i) => (
        <Html
          key={agent.id}
          portal={portal as RefObject<HTMLElement>}
          position={TAG_POSITIONS[i]}
          center
          zIndexRange={[12, 11]}
        >
          <div
            ref={(el) => {
              tagRefs.current[i] = el
            }}
            className="agent-tag-wrap"
          >
            <div className="agent-tag" data-status="idle">
              <span className="agent-tag__icon" aria-hidden="true" />
              <span className="agent-tag__name">{agent.name}</span>
              <span className="agent-tag__metric" />
            </div>
          </div>
        </Html>
      ))}
    </group>
  )
}
