import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Caption } from './Caption'
import { FallbackSequence } from './FallbackSequence'
import { Footer } from './Footer'
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

  it('the footer does not repeat the Launch CTA', () => {
    expect(renderToStaticMarkup(<Footer />)).not.toContain('Launch NEXUS')
  })

  it('the rail keeps every step name for assistive tech while showing only the active one', () => {
    const html = renderToStaticMarkup(<ProgressRail statuses={agentStatuses(0.35)} />)
    for (const name of ['Explorer', 'Knowledge', 'Documentation', 'QA', 'Demo', 'Release']) expect(html).toContain(name)
  })
})
