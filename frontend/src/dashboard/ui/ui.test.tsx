/// <reference types="node" />
import { renderToStaticMarkup as html } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { STATUS_UI } from './status'
import { StatusGlyph, StatusPill } from './StatusGlyph'
import { Tabs } from './Tabs'
import { Panel } from './Panel'
import { readFileSync } from 'node:fs'

// vitest blanks CSS imports (even ?raw), so read the stylesheet from disk
const css = readFileSync(new URL('../dashboard.css', import.meta.url), 'utf8')

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
    const start = css.indexOf('@media (prefers-reduced-motion: no-preference)')
    const end = css.indexOf('@keyframes nx-pulse')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(css.slice(start, end)).toMatch(/\.nx-glyph\[data-tone='active'\]\s*\{[^}]*animation:\s*nx-pulse/)
    expect(css).not.toContain("[data-state='running']")
  })
})

describe('Panel', () => {
  const labelledBy = (out: string) => {
    const ref = out.match(/aria-labelledby="([^"]+)"/)?.[1]
    const heading = out.match(/<h2 id="([^"]+)"/)?.[1]
    return { ref, heading }
  }
  it('labels itself by its heading even without an id', () => {
    const { ref, heading } = labelledBy(html(<Panel title="Recent">x</Panel>))
    expect(ref).toBeTruthy()
    expect(ref).not.toContain('undefined')
    expect(ref).toBe(heading)
  })
  it('keeps the id-based heading id when an id is given', () => {
    expect(labelledBy(html(<Panel id="runs" title="Runs">x</Panel>))).toEqual({ ref: 'runs-title', heading: 'runs-title' })
  })
  it('has no aria-labelledby without a title', () => {
    expect(html(<Panel id="t">x</Panel>)).not.toContain('aria-labelledby')
  })
})

describe('motion', () => {
  it('never transitions or animates layout properties', () => {
    const decls = [...css.matchAll(/transition:\s*([^;}]+)/g)].map((m) => m[1])
    expect(decls.length).toBeGreaterThan(0)
    for (const d of decls) expect(d).not.toMatch(/\b(width|height|left|right|top|bottom|padding|margin|all)\b/)
    const frames = [...css.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]*\{[^}]*\})*)[^}]*\}/g)]
    expect(frames.length).toBeGreaterThan(0)
    for (const kf of frames) {
      expect(kf[1]).not.toMatch(/(?:^|[\s;{])(width|height|left|right|top|bottom|padding|margin)\s*:/)
    }
  })
  it('puts every transition and animation behind prefers-reduced-motion: no-preference', () => {
    // Strip the no-preference blocks; nothing that moves may remain
    const outside = css.replace(/@media \(prefers-reduced-motion: no-preference\)\s*\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '')
    expect(outside).not.toMatch(/(?:transition|animation)\s*:/)
  })
})
