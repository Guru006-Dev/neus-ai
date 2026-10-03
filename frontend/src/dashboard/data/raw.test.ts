// src/dashboard/data/raw.test.ts
import { describe, expect, it } from 'vitest'
import { isRawRunLive, isRawRunStored, RAW_STATUSES } from './raw'
import type { RawAgentName, RawTask } from './raw'

const glob = (g: Record<string, unknown>) => g
const polls = glob(import.meta.glob('../../../e2e/fixtures/*-poll-*.json', { eager: true, import: 'default' })) as Record<string, unknown>
const one = (name: string) => {
  const all = import.meta.glob('../../../e2e/fixtures/*.json', { eager: true, import: 'default' }) as Record<string, unknown>
  const key = Object.keys(all).find((k) => k.endsWith('/' + name))
  if (!key) throw new Error('missing fixture ' + name)
  return all[key] as Record<string, unknown>
}
const AGENTS: RawAgentName[] = ['explorer', 'knowledge_graph', 'documentation', 'qa', 'demo', 'release']
const TS = /^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d/
const pollsOf = (prefix: string) => Object.entries(polls).filter(([k]) => k.includes(`/${prefix}-poll-`)).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v as { status: string; tasks: RawTask[] })

describe('raw response types match the recorded backend', () => {
  it('every recorded poll is a live run (and not a stored one) with known statuses', () => {
    for (const [file, body] of Object.entries(polls)) {
      expect(isRawRunLive(body), file).toBe(true)
      expect(isRawRunStored(body), file).toBe(false)
      const run = body as { status: string; tasks: RawTask[] }
      expect(RAW_STATUSES).toContain(run.status)
      for (const t of run.tasks) {
        expect(RAW_STATUSES).toContain(t.status)
        expect(AGENTS).toContain(t.agent_name)
        expect(typeof t.priority).toBe('number')
        expect(typeof t.retry_count).toBe('number')
        expect(typeof t.input_data.context).toBe('object')
        expect(t.input_data.context).not.toBeNull()
        expect(t.error_msg === null || typeof t.error_msg === 'string').toBe(true)
        expect(t.created_at).toMatch(TS)
        expect(t.updated_at).toMatch(TS)
      }
    }
  })

  it('both runs have a start and a terminal snapshot', () => {
    for (const prefix of ['full', 'qa']) {
      const seq = pollsOf(prefix)
      expect(seq.length, prefix).toBeGreaterThanOrEqual(2)
      expect(['QUEUED', 'RUNNING']).toContain(seq[0].status)
      expect(seq[seq.length - 1].status).toBe('COMPLETED')
    }
  })

  it('stored-after-restart is the stored shape only', () => {
    const s = one('stored-after-restart.json')
    expect(isRawRunStored(s)).toBe(true)
    expect(isRawRunLive(s)).toBe(false)
    expect(RAW_STATUSES).toContain(s.status)
  })

  it('create responses are SUBMITTED', () => {
    for (const n of ['full-create.json', 'qa-create.json']) {
      const c = one(n)
      expect(typeof c.workflow_id).toBe('string')
      expect(c.status).toBe('SUBMITTED')
    }
  })

  it('system-status has the typed counters and only known agents', () => {
    const s = one('system-status.json') as {
      jobs_summary: { workflows: Record<string, number>; tasks: Record<string, number> }
      concurrency: Record<string, Record<string, number>>
      queues: Record<string, number>
    }
    for (const k of ['running', 'queued', 'completed', 'failed', 'total']) expect(typeof s.jobs_summary.workflows[k], k).toBe('number')
    for (const k of ['running', 'queued', 'total']) expect(typeof s.jobs_summary.tasks[k], k).toBe('number')
    for (const [agent, c] of Object.entries(s.concurrency)) {
      expect(AGENTS).toContain(agent)
      for (const k of ['active', 'limit', 'available']) expect(typeof c[k], `${agent}.${k}`).toBe('number')
    }
    for (const v of Object.values(s.queues)) expect(typeof v).toBe('number')
  })

  it('not-found stores the capture envelope with a 404 detail', () => {
    const n = one('not-found.json') as { status: number; body: { detail: unknown } }
    expect(n.status).toBe(404)
    expect(typeof n.body.detail).toBe('string')
  })

  it('derived-failed is a live run with exactly one failed task carrying a message', () => {
    const d = one('derived-failed.json') as { status: string; tasks: RawTask[] }
    expect(isRawRunLive(d)).toBe(true)
    expect(d.status).toBe('FAILED')
    const failed = d.tasks.filter((t) => t.status === 'FAILED')
    expect(failed).toHaveLength(1)
    expect(failed[0].error_msg).toBeTruthy()
  })
})
