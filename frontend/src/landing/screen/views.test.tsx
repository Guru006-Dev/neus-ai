import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GOAL, QA } from '../nexus-story'
import { SCREEN_STEPS, type ScreenView } from '../timeline'
import { ScreenContent } from './ScreenContent'
import { visibleCount } from './util'

const VIEWS: ScreenView[] = ['prompt', 'orchestrator', 'explorer', 'knowledge', 'documentation', 'qa', 'demo', 'release']
const render = (view: ScreenView, progress: number) => renderToStaticMarkup(<ScreenContent view={view} progress={progress} />)

describe('screen views', () => {
  it('render deterministically at every quantized step', () => {
    for (const view of VIEWS) {
      for (let s = 0; s <= SCREEN_STEPS; s++) {
        const p = s / SCREEN_STEPS
        const first = render(view, p)
        expect(render(view, p)).toBe(first)
        expect(first).toContain(`data-screen="${view}"`)
      }
    }
  })

  it('visibleCount reveals items monotonically from 0 to total', () => {
    expect(visibleCount(0, 7)).toBe(0)
    expect(visibleCount(1, 7)).toBe(7)
    let prev = 0
    for (let p = 0; p <= 1; p += 0.01) {
      const n = visibleCount(p, 7)
      expect(n).toBeGreaterThanOrEqual(prev)
      prev = n
    }
  })

  it('prompt types the goal, then presses Run', () => {
    expect(render('prompt', 0)).not.toContain(GOAL.slice(0, 10))
    const done = render('prompt', 1)
    expect(done).toContain(GOAL)
    expect(done).toContain('is-pressed')
  })

  it('explorer resolves every source', () => {
    expect(render('explorer', 1).match(/✓/g)).toHaveLength(7)
  })

  it('QA flags the flaky check, then passes it on retry', () => {
    let failing = -1
    for (let s = 0; s <= SCREEN_STEPS; s++) {
      if (visibleCount(s / SCREEN_STEPS, QA.checks.length) === QA.flakyIndex) failing = s
    }
    expect(failing).toBeGreaterThan(-1)
    expect(render('qa', failing / SCREEN_STEPS)).toContain('failed · retrying')
    expect(render('qa', 1)).toContain('passed on retry')
  })

  it('release ends with the packaged artifact', () => {
    const html = render('release', 1)
    expect(html).toContain('data-ready="true"')
    expect(html).toContain('nexus-run-0142.zip')
  })

  it('orchestrator assigns agents only after it has planned', () => {
    expect(render('orchestrator', 0.25)).not.toContain('assigned')
    expect(render('orchestrator', 1).match(/>assigned</g)).toHaveLength(6)
  })

  it('demo shows the three-app comparison instead of a generic shape', () => {
    const html = render('demo', 1)
    for (const app of ['Inkwell', 'Noteloom', 'Quillbase']) expect(html).toContain(app)
    expect(html).not.toContain('class="wire"')
    expect(html).toContain('data-winner="true"')
  })

  it('a crossfade mounts the outgoing view behind the incoming one', () => {
    const html = renderToStaticMarkup(<ScreenContent view="knowledge" progress={0} outgoing="explorer" />)
    expect(html.match(/data-screen=/g)).toHaveLength(2)
    expect(html).toContain('data-role="out"')
    expect(render('knowledge', 0).match(/data-screen=/g)).toHaveLength(1)
  })
})
