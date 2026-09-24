import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Caption } from './Caption'
import { FallbackSequence } from './FallbackSequence'
import { ProgressRail } from './ProgressRail'
import { agentStatuses } from './timeline'

describe('overlays', () => {
  it('caption shows the active agent without a live region', () => {
    const html = renderToStaticMarkup(<Caption frame={{ phase: 'agents', agent: 'explorer' }} />)
    expect(html).toContain('Explorer')
    expect(html).not.toContain('aria-live')
  })

  it('caption renders nothing during the still phase', () => {
    expect(renderToStaticMarkup(<Caption frame={{ phase: 'still', agent: null }} />)).toBe('')
  })

  it('rail marks only the active agent as the current step', () => {
    const html = renderToStaticMarkup(<ProgressRail statuses={agentStatuses(0.35)} />)
    expect(html.match(/aria-current="step"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-current="step"[^>]*>.*?Knowledge/)
  })

  it('fallback tells the whole story: 8 screens plus the NEXUS finale', () => {
    const html = renderToStaticMarkup(<FallbackSequence />)
    expect(html.match(/class="fallback__step[ "]/g)).toHaveLength(9)
    expect(html.match(/data-screen=/g)).toHaveLength(8)
    expect(html).toContain('href="/dashboard"')
  })
})
