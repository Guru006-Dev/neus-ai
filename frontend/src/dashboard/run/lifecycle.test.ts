import { describe, expect, it } from 'vitest'
import { ApiError } from '../data/client'
import { normalizeRun } from '../data/normalize'
import { nextPollDelay, reduceRunView } from './lifecycle'
import derivedFailed from '../../../e2e/fixtures/derived-failed.json'

const polls = Object.entries(import.meta.glob('../../../e2e/fixtures/full-poll-*.json', { eager: true, import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, v]) => v)
const active = normalizeRun(polls[0])
const done = normalizeRun(polls[polls.length - 1])
const failedRun = normalizeRun(derivedFailed)
const err = (k: ApiError['kind']) => ({ type: 'error' as const, error: new ApiError(k, k) })

describe('run lifecycle', () => {
  it('uses recordings that are running first, completed last, and failed derived', () => {
    expect(active.status).toBe('running')
    expect(done.status).toBe('completed')
    expect(failedRun.status).toBe('failed')
  })
  it('moves loading -> active -> completed and stops polling at the end', () => {
    let v = reduceRunView({ kind: 'loading' }, { type: 'loaded', run: active })
    expect(v).toEqual({ kind: 'active', run: active, reconnecting: false })
    expect(nextPollDelay(v, 0, false)).toBe(1500)
    v = reduceRunView(v, { type: 'loaded', run: done })
    expect(v.kind).toBe('completed')
    expect(nextPollDelay(v, 0, false)).toBeNull()
  })
  it('keeps data and reconnects with backoff while active', () => {
    for (const k of ['unreachable', 'server', 'bad-response'] as const) {
      const v = reduceRunView({ kind: 'active', run: active, reconnecting: false }, err(k))
      expect(v).toMatchObject({ kind: 'active', reconnecting: true, run: active })
    }
    const v = reduceRunView({ kind: 'active', run: active, reconnecting: false }, err('unreachable'))
    expect([1, 2, 3, 4, 5].map((f) => nextPollDelay(v, f, false))).toEqual([3000, 6000, 12000, 15000, 15000])
  })
  it('clears reconnecting when data returns', () => {
    const v = reduceRunView({ kind: 'active', run: active, reconnecting: true }, { type: 'loaded', run: active })
    expect(v).toMatchObject({ kind: 'active', reconnecting: false })
  })
  it('treats a 404 mid-run as a lost run, remembering the last data', () => {
    expect(reduceRunView({ kind: 'active', run: active, reconnecting: false }, err('not-found'))).toEqual({ kind: 'not-found', lastRun: active })
    expect(reduceRunView({ kind: 'loading' }, err('not-found'))).toEqual({ kind: 'not-found', lastRun: null })
  })
  it('goes unreachable from loading and keeps backing off', () => {
    const v = reduceRunView({ kind: 'loading' }, err('unreachable'))
    expect(v).toEqual({ kind: 'unreachable', lastRun: null })
    expect(reduceRunView(v, err('server'))).toEqual({ kind: 'unreachable', lastRun: null })
    expect(nextPollDelay(v, 2, false)).toBe(6000)
  })
  it('shows stored detail as degraded and does not poll it', () => {
    const v = reduceRunView({ kind: 'loading' }, { type: 'loaded', run: { ...done, detail: 'stored' } })
    expect(v.kind).toBe('degraded')
    expect(nextPollDelay(v, 0, false)).toBeNull()
  })
  it('fails with the first failed agent, from the derived-failed recording', () => {
    const v = reduceRunView({ kind: 'loading' }, { type: 'loaded', run: failedRun })
    expect(v).toMatchObject({ kind: 'failed', failedAgent: 'qa' })
    expect(nextPollDelay(v, 0, false)).toBeNull()
  })
  it('gives a null failedAgent when no agent failed; cancelled stops', () => {
    const noFailedAgent = { ...failedRun, agents: failedRun.agents.map((a) => ({ ...a, state: 'completed' as const })) }
    expect(reduceRunView({ kind: 'loading' }, { type: 'loaded', run: noFailedAgent })).toMatchObject({ kind: 'failed', failedAgent: null })
    const c = reduceRunView({ kind: 'loading' }, { type: 'loaded', run: { ...done, status: 'cancelled' } })
    expect(c.kind).toBe('cancelled')
    expect(nextPollDelay(c, 0, false)).toBeNull()
  })
  it('pauses while hidden and ignores aborts', () => {
    expect(nextPollDelay({ kind: 'active', run: active, reconnecting: false }, 0, true)).toBeNull()
    const v = { kind: 'active' as const, run: active, reconnecting: false }
    expect(reduceRunView(v, err('aborted'))).toBe(v)
  })
  it('polls loading at 1500 and stops for not-found', () => {
    expect(nextPollDelay({ kind: 'loading' }, 0, false)).toBe(1500)
    expect(nextPollDelay({ kind: 'not-found', lastRun: null }, 0, false)).toBeNull()
  })
})
