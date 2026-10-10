import { renderToStaticMarkup as html } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BackendStatus } from './BackendStatus'
import { NAV } from './nav'
import { Sidebar } from './Sidebar'
import NotFoundPage from '../pages/NotFoundPage'

describe('navigation model', () => {
  it('groups sections as in the spec, with product names', () => {
    expect(NAV.map((g) => [g.label, g.items.map((i) => i.label)])).toEqual([
      [null, ['Overview', 'Runs']],
      ['Intelligence', ['Agents']],
      ['Outputs', ['Knowledge', 'Documentation', 'QA', 'Demos', 'Releases']],
    ])
    const outputs = NAV[2].items
    expect(outputs.every((i) => i.needsBackend)).toBe(true)
    expect(NAV.flatMap((g) => g.items).every((i) => i.to.startsWith('/dashboard'))).toBe(true)
  })
})

describe('backend status', () => {
  it('shows the three states with text labels', () => {
    expect(html(<BackendStatus status="connected" />)).toContain('Connected')
    expect(html(<BackendStatus status="connecting" />)).toContain('Connecting…')
    expect(html(<BackendStatus status="unreachable" />)).toContain('Backend unreachable')
  })
})

describe('sidebar', () => {
  const render = (mode: 'sidebar' | 'rail') =>
    html(
      <MemoryRouter initialEntries={['/dashboard/runs/wf-1']}>
        <Sidebar mode={mode} status="connecting" />
      </MemoryRouter>,
    )
  it('renders the Dashboard nav with groups, the current section and Settings', () => {
    const out = render('sidebar')
    expect(out).toContain('aria-label="Dashboard"')
    expect(out).toContain('Intelligence')
    expect(out).toContain('Settings')
    expect(out).toMatch(/aria-current="page"[^>]*>Runs|Runs[^<]*<\/a>/)
    expect(out).toContain('Cross-run view needs backend support')
  })
  it('collapses to labelled first letters in rail mode', () => {
    const out = render('rail')
    expect(out).toContain('aria-label="Expand navigation"')
    expect(out).toContain('aria-label="Knowledge"')
  })
  it('exposes the "needs backend support" cue as text, not only a hidden dot', () => {
    const out = render('sidebar')
    const knowledge = out.match(/<a[^>]*href="\/dashboard\/knowledge"[^>]*>(.*?)<\/a>/)?.[1] ?? ''
    expect(knowledge).toMatch(/<span class="sr-only">\s*\(needs backend support\)<\/span>/)
    const runs = out.match(/<a[^>]*href="\/dashboard\/runs"[^>]*>(.*?)<\/a>/)?.[1] ?? ''
    expect(runs).not.toContain('needs backend support')
  })
  it('does not use a live region for the polled backend status', () => {
    for (const s of ['connected', 'connecting', 'unreachable'] as const) {
      expect(html(<BackendStatus status={s} />)).not.toMatch(/role="(status|alert|log)"|aria-live/)
    }
  })
})

describe('not found page', () => {
  it('has one h1 and a link to Overview', () => {
    const out = html(<MemoryRouter><NotFoundPage /></MemoryRouter>)
    expect(out.match(/<h1/g)).toHaveLength(1)
    expect(out).toContain("This page doesn&#x27;t exist")
    expect(out).toContain('href="/dashboard"')
  })
})
