import { describe, expect, it } from 'vitest'
import { AGENTS } from '../../landing/nexus-story'
import derivedFailed from '../../../e2e/fixtures/derived-failed.json'
import { AGENT_ORDER, agentName, fromInternal } from './agents'
import { normalizeRun } from './normalize'
import { parseBackendTime } from './time'

const polls = Object.values(import.meta.glob('../../../e2e/fixtures/full-poll-*.json', { eager: true, import: 'default' })) as unknown[]
const last = polls[polls.length - 1]
const qaPolls = Object.values(import.meta.glob('../../../e2e/fixtures/qa-poll-*.json', { eager: true, import: 'default' })) as unknown[]
const qaLast = qaPolls[qaPolls.length - 1]

describe('agents', () => {
  it('product names match the landing page exactly, in order', () => {
    expect(AGENT_ORDER.map(agentName)).toEqual(AGENTS.map((a) => a.name))
  })
  it('maps internal names and rejects unknown ones', () => {
    expect(fromInternal('knowledge_graph')).toBe('knowledge')
    expect(fromInternal('orchestrator')).toBeNull()
  })
})

describe('normalizeRun', () => {
  it('always yields all six agents in product order', () => {
    for (const p of polls) expect(normalizeRun(p).agents.map((a) => a.id)).toEqual(AGENT_ORDER)
  })
  it('the first poll has no running agent invented', () => {
    const first = normalizeRun(polls[0])
    expect(first.agents.filter((a) => a.state === 'running').length).toBeLessThanOrEqual(1)
  })
  it('a finished QA-flow run marks agents without tasks as not in this run', () => {
    const run = normalizeRun(qaLast)
    expect(['completed', 'failed']).toContain(run.status)
    const withTask = new Set((qaLast as { tasks: { agent_name: string }[] }).tasks.map((t) => fromInternal(t.agent_name)))
    for (const a of run.agents) if (!withTask.has(a.id)) expect(a.state).toBe('not-in-run')
    for (const id of ['documentation', 'demo', 'release'] as const) expect(run.agents.find((a) => a.id === id)!.state).toBe('not-in-run')
  })
  it('reads outputs from context by key and never from /status', () => {
    const run = normalizeRun(last)
    expect(Object.keys(run.outputs).every((k) => AGENT_ORDER.includes(k as never))).toBe(true)
  })
  it('stored (post-restart) runs infer completion from context and have no elapsed', () => {
    const stored = { workflow_id: 'wf-x', status: 'COMPLETED', goal: 'g', context: (last as { context: object }).context }
    const run = normalizeRun(stored)
    expect(run.detail).toBe('stored')
    expect(run.elapsedMs).toBeNull()
    expect(run.agents.find((a) => a.id === 'explorer')!.state).toBe('completed')
  })
  it('splits error messages into a summary and the traceback', () => {
    const t = { ...(last as { tasks: object[] }).tasks[0], status: 'FAILED', error_msg: 'Boom\nTraceback (most recent call last):\n  x' }
    const run = normalizeRun({ ...(last as object), status: 'FAILED', tasks: [t] })
    expect(run.agents[0].error).toEqual({ summary: 'Boom', detail: 'Boom\nTraceback (most recent call last):\n  x' })
  })
  it('uses the newest task when an agent was retried', () => {
    const base = (last as { tasks: Record<string, unknown>[] }).tasks[0]
    const older = { ...base, task_id: 'a', status: 'FAILED', created_at: '2026-01-01 00:00:00', updated_at: '2026-01-01 00:00:05', error_msg: 'x' }
    const newer = { ...base, task_id: 'b', status: 'COMPLETED', created_at: '2026-01-01 00:00:06', updated_at: '2026-01-01 00:00:09' }
    const run = normalizeRun({ ...(last as object), tasks: [older, newer] })
    expect(run.agents[0]).toMatchObject({ state: 'completed', retries: 1, elapsedMs: 3000 })
  })
  it('the derived failed recording yields a failed run with a failed qa agent', () => {
    const run = normalizeRun(derivedFailed)
    const msg = (derivedFailed as { tasks: { agent_name: string; error_msg: string }[] }).tasks.find((t) => t.agent_name === 'qa')!.error_msg
    expect(run.status).toBe('failed')
    const qa = run.agents.find((a) => a.id === 'qa')!
    expect(qa.state).toBe('failed')
    expect(qa.error?.summary).toBe(msg.split('\n', 1)[0].trim())
    expect(qa.error?.detail).toBe(msg)
    for (const id of ['demo', 'release'] as const) expect(run.agents.find((a) => a.id === id)!.state).toBe('completed')
  })
})

describe('time', () => {
  it('parses SQLite CURRENT_TIMESTAMP as UTC', () => {
    expect(parseBackendTime('2026-10-03 14:02:07')!.toISOString()).toBe('2026-10-03T14:02:07.000Z')
    expect(parseBackendTime('nonsense')).toBeNull()
  })
})
