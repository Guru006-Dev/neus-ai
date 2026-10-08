import type { JSX } from 'react'
import { renderToStaticMarkup as html } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { normalizeOutput, normalizeRun } from '../data/normalize'
import { AGENT_ORDER } from '../data/agents'
import { OUTPUT_RENDERERS } from './index'
import { renderMarkdown } from './markdown'
import { layoutGraph } from './graphLayout'
import { selectedFromHash } from '../run-detail/derive'

const polls = Object.values(import.meta.glob('../../../e2e/fixtures/full-poll-*.json', { eager: true, import: 'default' })) as unknown[]
const run = normalizeRun(polls[polls.length - 1])
const wrap = (el: JSX.Element) => html(<MemoryRouter>{el}</MemoryRouter>)

describe('output renderers', () => {
  it('render every recorded output', () => {
    for (const id of AGENT_ORDER) {
      const out = run.outputs[id]
      if (!out) continue
      const Render = OUTPUT_RENDERERS[id] as (p: { output: typeof out; runId: string }) => JSX.Element
      expect(() => wrap(<Render output={out} runId={run.id} />), id).not.toThrow()
    }
  })
  it('every renderer survives malformed output', () => {
    for (const id of AGENT_ORDER) for (const bad of ['just text', 42, [], { nodes: 'x', tests_run: {} }]) {
      const out = normalizeOutput(id, bad)
      if (!out) continue
      const Render = OUTPUT_RENDERERS[id] as (p: { output: typeof out; runId: string }) => JSX.Element
      expect(wrap(<Render output={out} runId="wf-x" />), `${id} ${JSON.stringify(bad)}`).toContain('Raw output')
    }
  })
  it('labels agent-reported numbers and never shows them as headline metrics', () => {
    const ex = run.outputs.explorer
    if (ex) expect(wrap(<OUTPUT_RENDERERS.explorer output={ex as never} runId={run.id} />)).toContain('Reported by agent')
  })
  it('sandboxes showcase iframes', () => {
    const demo = run.outputs.demo
    if (demo) expect(wrap(<OUTPUT_RENDERERS.demo output={demo as never} runId={run.id} />)).toMatch(/<iframe[^>]*sandbox="allow-scripts"[^>]*title="Demo showcase"|title="Demo showcase"[^>]*sandbox="allow-scripts"/)
  })
})

describe('markdown subset', () => {
  it('renders structure and escapes HTML', () => {
    const out = html(<>{renderMarkdown('# T\n\nHello **b** `c`\n\n- a\n- <img src=x onerror=alert(1)>')}</>)
    expect(out).toContain('<h3')
    expect(out).toContain('<strong>b</strong>')
    expect(out).toContain('&lt;img')
    expect(out).not.toContain('<img')
  })
})

describe('graph layout', () => {
  it('is deterministic and keeps the root centred', () => {
    const nodes = [{ id: 'root', label: 'R', type: 'CoreEntity' }, { id: 'a', label: 'A', type: 'Component' }, { id: 'b', label: 'B', type: 'AnalysisDimension' }]
    const a = layoutGraph(nodes, [], 300)
    expect(layoutGraph(nodes, [], 300)).toEqual(a)
    expect(a[0]).toEqual({ x: 150, y: 150 })
  })
})

describe('hash selection', () => {
  it('accepts agent ids and ignores malformed hashes without throwing', () => {
    expect(selectedFromHash('#qa')).toBe('qa')
    expect(selectedFromHash('#%')).toBeNull()
    expect(selectedFromHash('#%E0%A4%A')).toBeNull()
    expect(selectedFromHash('')).toBeNull()
  })
})
