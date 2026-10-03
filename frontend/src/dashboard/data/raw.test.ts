// src/dashboard/data/raw.test.ts
import { describe, expect, it } from 'vitest'
import { isRawRunLive, isRawRunStored, RAW_STATUSES } from './raw'

const polls = import.meta.glob('../../../e2e/fixtures/*-poll-*.json', { eager: true, import: 'default' }) as Record<string, unknown>

describe('raw response types match the recorded backend', () => {
  it('every recorded poll is a live or stored run with known statuses', () => {
    expect(Object.keys(polls).length).toBeGreaterThan(3)
    for (const [file, body] of Object.entries(polls)) {
      expect(isRawRunLive(body) || isRawRunStored(body), file).toBe(true)
      const run = body as { status: string; tasks?: { status: string; agent_name: string; created_at: string }[] }
      expect(RAW_STATUSES).toContain(run.status)
      for (const t of run.tasks ?? []) {
        expect(RAW_STATUSES).toContain(t.status)
        expect(['explorer', 'knowledge_graph', 'documentation', 'qa', 'demo', 'release']).toContain(t.agent_name)
        expect(t.created_at).toMatch(/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d/)
      }
    }
  })
})
