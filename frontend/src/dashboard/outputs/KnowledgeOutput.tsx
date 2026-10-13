import { useLayoutEffect, useRef, useState } from 'react'
import type { AgentOutput } from '../data/types'
import { layoutGraph } from './graphLayout'
import { RawOutput } from './RawOutput'

const SIZE = 360
const FONT = 11
const ADVANCE = FONT * 0.62 // estimated glyph advance, used only until the browser can measure the real font
const MARGIN = 2 // user units kept clear of each viewBox edge

type Anchor = 'start' | 'middle' | 'end'

/** Anchor a label towards the centre and report the room it has before the viewBox edge. */
function placeLabel(x: number, size = SIZE): { anchor: Anchor; room: number } {
  const c = size / 2
  const anchor: Anchor = Math.abs(x - c) < size * 0.15 ? 'middle' : x < c ? 'start' : 'end'
  const room = anchor === 'middle' ? 2 * (Math.min(x, size - x) - MARGIN) : (anchor === 'start' ? size - x : x) - MARGIN
  return { anchor, room }
}

const shorten = (label: string, n: number) => (n >= label.length ? label : `${label.slice(0, Math.max(1, n)).trimEnd()}…`)

/** The longest prefix of `label` (with an ellipsis when cut) whose width fits `room`. */
function fitLabel(label: string, room: number, width: (s: string) => number): string {
  if (width(label) <= room) return label
  let lo = 1, hi = label.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (width(shorten(label, mid)) <= room) lo = mid
    else hi = mid - 1
  }
  return shorten(label, lo)
}

const estimate = (s: string) => s.length * ADVANCE

/**
 * Labels are fitted with an estimate on first render, then re-fitted with the browser's real text metrics:
 * a hidden probe <text> in the same SVG renders in exactly the font the labels get (user stylesheets and
 * font fallbacks included), and fitting runs again whenever web fonts finish loading.
 */
function useFittedLabels(labels: string[], rooms: number[]) {
  const probeRef = useRef<SVGTextElement>(null)
  const key = JSON.stringify([labels, rooms])
  const [measured, setMeasured] = useState<{ key: string; texts: string[] } | null>(null)
  useLayoutEffect(() => {
    const probe = probeRef.current
    if (!probe || typeof probe.getComputedTextLength !== 'function') return
    let live = true
    const measure = () => {
      if (!live) return
      const width = (s: string) => {
        probe.textContent = s
        return probe.getComputedTextLength()
      }
      const texts = labels.map((l, i) => fitLabel(l, rooms[i], width))
      probe.textContent = ''
      setMeasured((m) => (m && m.key === key && m.texts.every((t, i) => t === texts[i]) ? m : { key, texts }))
    }
    measure()
    const fonts = document.fonts
    fonts?.ready.then(measure)
    fonts?.addEventListener?.('loadingdone', measure)
    return () => {
      live = false
      fonts?.removeEventListener?.('loadingdone', measure)
    }
    // `key` encodes labels and rooms
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const texts = measured?.key === key ? measured.texts : labels.map((l, i) => fitLabel(l, rooms[i], estimate))
  return { probeRef, texts }
}

export function KnowledgeOutput({ output }: { output: Extract<AgentOutput, { agent: 'knowledge' }>; runId: string }) {
  const nodes = Array.isArray(output.nodes) ? output.nodes : []
  const edges = Array.isArray(output.edges) ? output.edges : []
  const pos = layoutGraph(nodes, edges, SIZE)
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  const places = pos.map((p) => placeLabel(p.x))
  const { probeRef, texts } = useFittedLabels(nodes.map((n) => n.label), places.map((p) => p.room))
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
                <title>{n.label}</title>
                <circle cx={pos[i].x} cy={pos[i].y} r={n.id === 'root' ? 5 : 3} fill="var(--nx-text)" />
                <text x={pos[i].x} y={pos[i].y + (n.id === 'root' ? 16 : 13)} textAnchor={places[i].anchor} fontSize={FONT} fill="var(--nx-grey-300)">{texts[i]}</text>
              </g>
            ))}
            {/* Measuring probe: never visible, emptied after each measurement */}
            <text ref={probeRef} x={0} y={0} fontSize={FONT} visibility="hidden" aria-hidden="true" />
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
