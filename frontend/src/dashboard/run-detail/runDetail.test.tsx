/// <reference types="node" />
import { renderToStaticMarkup as html } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { normalizeRun } from '../data/normalize'
import type { Run, RunStatus } from '../data/types'
import { AgentList } from './AgentList'
import { OrchestratorBand } from './OrchestratorBand'
import { OutputPanel } from './OutputPanel'
import { RunHeader } from './RunHeader'
import { RunMap } from './RunMap'
import { RunStateNotice } from './RunStateNotice'
import { announcement } from './derive'

const raw = (name: string) => JSON.parse(readFileSync(new URL(`../../../e2e/fixtures/${name}`, import.meta.url), 'utf8'))
const run = (name: string): Run => normalizeRun(raw(name), Date.parse('2026-10-03T16:11:12Z'))
const text = (markup: string) => markup.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
const withStatus = (r: Run, status: RunStatus): Run => ({ ...r, status })

describe('OrchestratorBand', () => {
  it('describes each run status from real data and never counts "of 6"', () => {
    const queued = run('qa-poll-00.json')
    const running = run('qa-poll-03.json')
    const completed = run('qa-poll-04.json')
    const failed = run('derived-failed.json')
    const cases: [Run, RegExp][] = [
      [queued, /Queued: waiting for a worker/],
      [running, /Running · QA in progress/],
      [withStatus(running, 'waiting'), /Running · QA in progress/],
      [completed, /Complete · 3 agents ran/],
      [failed, /Failed at QA/],
      [withStatus(completed, 'cancelled'), /^OrchestratorCancelled$/],
    ]
    for (const [r, re] of cases) {
      const out = text(html(<OrchestratorBand run={r} reconnecting={false} />))
      expect(out).toMatch(re)
      expect(out).not.toMatch(/\bof\s*6\b|\d+\s*\/\s*6/)
    }
    expect(text(html(<OrchestratorBand run={running} reconnecting={false} />))).toContain('Updating every 1.5 s')
    expect(text(html(<OrchestratorBand run={running} reconnecting />))).toContain('Reconnecting…')
    expect(text(html(<OrchestratorBand run={completed} reconnecting={false} />))).not.toContain('Updating every')
  })

  it('counts the real tasks of a full run', () => {
    expect(text(html(<OrchestratorBand run={run('full-poll-07.json')} reconnecting={false} />))).toMatch(/Complete · 6 agents ran/)
  })
})

describe('RunMap', () => {
  it('labels all six agents with their state and draws a chain, not a fan-out', () => {
    const out = html(<RunMap run={run('qa-poll-04.json')} vertical={false} />)
    const label = /role="img"[^>]*aria-label="([^"]+)"|aria-label="([^"]+)"[^>]*role="img"/.exec(out)
    const aria = label?.[1] ?? label?.[2]
    expect(aria).toBe('Run map: Explorer complete, Knowledge complete, Documentation not in this run, QA complete, Demo not in this run, Release not in this run')
    // goal + six agents + N = 8 nodes, joined by exactly 7 edges
    expect(out.match(/<line/g)).toHaveLength(7)
    expect(out).not.toContain('<path')
    expect(out.match(/data-node=/g)).toHaveLength(8)
    expect(out).toMatch(/data-node="release"[^>]*data-state="not-in-run"/)
  })

  it('keeps the N muted until the run is completed', () => {
    expect(html(<RunMap run={run('qa-poll-03.json')} vertical={false} />)).toMatch(/data-node="n"[^>]*fill="#666F76"/)
    expect(html(<RunMap run={run('qa-poll-04.json')} vertical={false} />)).toMatch(/data-node="n"[^>]*fill="#E1E5E5"/)
    expect(html(<RunMap run={run('qa-poll-04.json')} vertical />)).toContain('data-orientation="vertical"')
  })
})

describe('AgentList', () => {
  it('lists six agents in product order and marks exactly one running step', () => {
    const out = html(<AgentList agents={run('qa-poll-03.json').agents} onSelect={() => {}} />)
    expect(out).toContain('aria-label="Agents"')
    expect(out.match(/<li/g)).toHaveLength(6)
    expect(out.match(/aria-current="step"/g)).toHaveLength(1)
    expect(out).toMatch(/<li[^>]*data-state="running"[^>]*aria-current="step"|<li[^>]*aria-current="step"[^>]*data-state="running"/)
  })

  it('shows a failed agent summary and a details disclosure', () => {
    const out = html(<AgentList agents={run('derived-failed.json').agents} onSelect={() => {}} />)
    const failed = /<li[^>]*data-state="failed"[^>]*>([\s\S]*?)<\/li>/.exec(out)?.[1] ?? ''
    expect(failed).toContain('Derived failure message (not produced by the backend)')
    expect(failed).toContain('<details')
    expect(failed).toContain('<pre>')
    expect(out).not.toContain('aria-current')
  })

  it('shows retries only when an agent was retried', () => {
    const agents = run('qa-poll-04.json').agents
    expect(html(<AgentList agents={agents} onSelect={() => {}} />)).not.toContain('retried')
    const retried = agents.map((a) => (a.id === 'qa' ? { ...a, retries: 2 } : a))
    expect(text(html(<AgentList agents={retried} onSelect={() => {}} />))).toContain('retried ×2')
  })
})

describe('RunHeader', () => {
  it('shows the goal, status, id and the elapsed definition', () => {
    const r = run('qa-poll-04.json')
    const out = html(<MemoryRouter><RunHeader run={r} /></MemoryRouter>)
    expect(out).toMatch(/<h1[^>]*>Run QA tests on the checkout flow of an online bookstore<\/h1>/)
    expect(out).toContain(r.id)
    expect(out).toContain('From the first agent being queued to the last agent finishing; excludes time waiting for the orchestrator.')
    expect(out).not.toContain('Started from this browser')
    expect(text(out)).toMatch(/elapsed \d+:\d\d\*/)
  })

  it('falls back to the run id and a dash', () => {
    const r = { ...run('stored-after-restart.json'), goal: '' }
    const out = text(html(<MemoryRouter><RunHeader run={r} /></MemoryRouter>))
    expect(out).toContain(`Run ${r.id}`)
    expect(out).toContain('elapsed —')
  })

  it('reads "running for" while active', () => {
    expect(text(html(<MemoryRouter><RunHeader run={run('qa-poll-03.json')} /></MemoryRouter>))).toMatch(/running for \d+:\d\d\*/)
  })
})

describe('RunStateNotice', () => {
  const wrap = (el: React.ReactElement) => text(html(<MemoryRouter>{el}</MemoryRouter>))
  it('uses the exact copy for each state', () => {
    expect(wrap(<RunStateNotice id="wf-1" view={{ kind: 'loading' }} retry={() => {}} />)).toContain('Loading run…')
    const nf = wrap(<RunStateNotice id="wf-1" view={{ kind: 'not-found', lastRun: run('full-poll-01.json') }} retry={() => {}} />)
    expect(nf).toContain("This run isn't on the backend. It may have been lost when the backend restarted; runs in progress are kept in memory.")
    expect(nf).toContain('Remove from this browser')
    expect(nf).toContain('Back to runs')
    expect(nf).toContain('Last known state')
    expect(wrap(<RunStateNotice id="wf-1" view={{ kind: 'not-found', lastRun: null }} retry={() => {}} />)).not.toContain('Last known state')
    expect(wrap(<RunStateNotice id="wf-1" view={{ kind: 'degraded', run: run('stored-after-restart.json') }} retry={() => {}} />)).toContain("Showing saved results. Step-by-step detail isn't available after a backend restart.")
    const un = wrap(<RunStateNotice id="wf-1" view={{ kind: 'unreachable', lastRun: null }} retry={() => {}} />)
    expect(un).toContain("Can't reach the NEXUS backend.")
    expect(un).toContain('Retry')
  })
})

describe('OutputPanel', () => {
  it('tabs the agents with output and defaults to the most recently completed one', () => {
    const out = html(<MemoryRouter><OutputPanel run={run('qa-poll-04.json')} selected={null} onSelect={() => {}} /></MemoryRouter>)
    expect(out.match(/role="tab"/g)).toHaveLength(3)
    expect(out).toMatch(/aria-selected="true"[^>]*>QA</)
    expect(out).toMatch(/role="tabpanel"[^>]*id="panel-qa"|id="panel-qa"[^>]*role="tabpanel"/)
    expect(out).toContain('Raw output')
  })

  it('explains a selected agent without output', () => {
    expect(text(html(<OutputPanel run={run('qa-poll-04.json')} selected="demo" onSelect={() => {}} />))).toContain('Not produced in this run')
    expect(text(html(<OutputPanel run={run('qa-poll-03.json')} selected="demo" onSelect={() => {}} />))).toContain('No output yet')
  })
})

describe('live announcements', () => {
  it('announces agents finishing and the run ending, never poll ticks', () => {
    expect(announcement(run('qa-poll-03.json'), run('qa-poll-03.json'))).toBe('')
    expect(announcement(run('qa-poll-02.json'), run('qa-poll-03.json'))).toBe('')
    expect(announcement(run('qa-poll-03.json'), run('qa-poll-04.json'))).toBe('QA complete. Run complete.')
    expect(announcement(withStatus(run('full-poll-06.json'), 'running'), run('derived-failed.json'))).toBe('QA failed. Run failed.')
  })
})
