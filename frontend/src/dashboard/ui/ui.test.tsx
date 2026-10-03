import { renderToStaticMarkup as html } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { STATUS_UI } from './status'
import { StatusGlyph, StatusPill } from './StatusGlyph'
import { Tabs } from './Tabs'
import css from '../dashboard.css?raw'

describe('status vocabulary', () => {
  it('uses the NEXUS glyphs and labels for every state', () => {
    expect(STATUS_UI).toMatchObject({
      queued: { glyph: '○', label: 'Queued' },
      waiting: { glyph: '○', label: 'Waiting' },
      running: { glyph: '●', label: 'Running' },
      completed: { glyph: '✓', label: 'Complete' },
      failed: { glyph: '✕', label: 'Failed' },
      cancelled: { glyph: '–', label: 'Cancelled' },
      'not-started': { glyph: '○', label: 'Not started' },
      'not-in-run': { glyph: '–', label: 'Not in this run' },
    })
  })

  it('hides the glyph from assistive tech and always renders the text label', () => {
    const out = html(<StatusPill state="running" />)
    expect(out).toMatch(/aria-hidden="true"[^>]*>●/)
    expect(out).toContain('Running')
    expect(html(<StatusGlyph state="failed" />)).toContain('data-tone="error"')
  })

  it('tabs follow the ARIA tabs pattern', () => {
    const out = html(<Tabs label="Outputs" items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} value="b" onChange={() => {}} />)
    expect(out).toContain('role="tablist"')
    expect(out.match(/role="tab"/g)).toHaveLength(2)
    expect(out).toMatch(/aria-selected="true"[^>]*>B/)
    expect(out).toMatch(/tabindex="-1"[^>]*>A/)
  })

  it('pulses the active glyph inside the no-preference motion block', () => {
    const block = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\}/)
    expect(block).not.toBeNull()
    expect(block![1]).toMatch(/\.nx-glyph\[data-tone='active'\]\s*\{[^}]*animation:\s*nx-pulse/)
    expect(css).not.toContain("[data-state='running']")
  })
})
