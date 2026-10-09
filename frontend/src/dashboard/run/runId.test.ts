import { describe, expect, it } from 'vitest'
import { isRunId } from './runId'

describe('isRunId', () => {
  it('accepts wf- ids of lowercase alphanumerics', () => {
    expect(isRunId('wf-abc123')).toBe(true)
    expect(isRunId('wf-1')).toBe(true)
  })
  it.each(['', 'wf-', 'WF-abc', 'wf-AB', 'wf-a-b', 'wf-a b', ' wf-abc', 'wf-abc\n', '../x', 'abc', 'wf-abc/../x'])('rejects %j', (v) => {
    expect(isRunId(v)).toBe(false)
  })
})
