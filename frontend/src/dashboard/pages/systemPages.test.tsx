// @vitest-environment happy-dom
import { renderToStaticMarkup as html } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AGENT_ORDER } from '../data/agents'
import type { SystemSnapshot } from '../data/types'
import type { SystemStatusState } from '../run/useSystemStatus'
import AgentsPage from './AgentsPage'
import OverviewPage from './OverviewPage'

let state: SystemStatusState
vi.mock('../run/useSystemStatus', () => ({ useSystemStatus: () => state }))

const text = (el: React.ReactElement) => html(<MemoryRouter>{el}</MemoryRouter>).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const missing: SystemSnapshot = { workflows: null, agents: AGENT_ORDER.map((id) => ({ id, active: null, limit: null, queued: null })) }

describe('system counts the backend did not report', () => {
  it('Agents page reads "unavailable", never a fabricated 0/0 busy · 0 queued', () => {
    state = { status: 'connected', snapshot: missing }
    const out = text(<AgentsPage />)
    expect(out).not.toMatch(/\b0\s*\/\s*0\b|\b0 queued|busy/)
    expect(out.match(/Live worker pool · unavailable/g)).toHaveLength(AGENT_ORDER.length)
  })
  it('Agents page shows the half it has when only the queue is missing', () => {
    state = { status: 'connected', snapshot: { workflows: null, agents: AGENT_ORDER.map((id) => ({ id, active: 1, limit: 4, queued: null })) } }
    const out = text(<AgentsPage />)
    expect(out).toContain('Live worker pool · 1/4 busy · queue unavailable')
    expect(out).not.toMatch(/\b0 queued/)
  })
  it('Overview reads "unavailable", never "0 running"', () => {
    state = { status: 'connected', snapshot: missing }
    const out = text(<OverviewPage />)
    expect(out).toContain('Workflows since backend start: unavailable')
    expect(out).not.toMatch(/\b0 running/)
  })
})
