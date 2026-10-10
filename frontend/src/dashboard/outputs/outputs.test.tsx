// @vitest-environment happy-dom
import { act, type JSX } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup as html } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { normalizeOutput, normalizeRun } from '../data/normalize'
import { AGENT_ORDER } from '../data/agents'
import { OUTPUT_RENDERERS } from './index'
import { renderMarkdown } from './markdown'
import { layoutGraph } from './graphLayout'
import type { AgentOutput } from '../data/types'
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
  it('keeps every graph label inside the drawing so none is clipped at any width', () => {
    const out = wrap(<OUTPUT_RENDERERS.knowledge output={run.outputs.knowledge as Extract<AgentOutput, { agent: 'knowledge' }>} runId={run.id} />)
    const size = Number(out.match(/viewBox="0 0 (\d+) \d+"/)![1])
    const texts = [...out.matchAll(/<text x="([\d.]+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)]
    expect(texts.length).toBeGreaterThan(0)
    for (const [, x, anchor, label] of texts) {
      const w = label.length * 11 * 0.62 // generous average advance for 11px Geist
      const left = anchor === 'start' ? +x : anchor === 'end' ? +x - w : +x - w / 2
      expect(left, label).toBeGreaterThanOrEqual(0)
      expect(left + w, label).toBeLessThanOrEqual(size)
    }
    // Full labels stay available: in the node list and as the node's tooltip
    expect(out).toContain('Analyze The Onboarding Flows Of Three Note-Taking Apps And Compare Them</title>')
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

describe('markdown termination', () => {
  it('always terminates and returns an array', () => {
    const inputs = ['# a\rb', '## x y', '#  ', '\r\r\r', 'a\u2028b', '# a\u2029# b', '- x\r1. y\r\r# h\r', '#\n##\n###\n####', '\u2028\u2029\r', '*\r-\r1.']
    for (const s of inputs) expect(Array.isArray(renderMarkdown(s)), JSON.stringify(s)).toBe(true)
  })
  it('treats bare CR and unicode separators as line breaks', () => {
    const out = html(<>{renderMarkdown('# a\rb')}</>)
    expect(out).toContain('<h3')
    expect(out).toContain('<p')
  })
})

describe('QA row keys', () => {
  it('renders duplicate and empty test names without key warnings', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const out = normalizeOutput('qa', { tests_run: [{ name: 'dup', result: 'pass' }, { name: 'dup', result: 'fail' }, { name: '', result: 'pass' }] })
    expect(out).toBeTruthy()
    const host = document.createElement('div')
    const root = createRoot(host)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    act(() => { root.render(<MemoryRouter><OUTPUT_RENDERERS.qa output={out as never} runId="wf-x" /></MemoryRouter>) })
    expect(host.querySelectorAll('tbody tr').length).toBe(3)
    expect(spy).not.toHaveBeenCalled()
    act(() => root.unmount())
    spy.mockRestore()
  })
})
