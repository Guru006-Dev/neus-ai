import { expect, test, type Page } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { fixture, mockBackend } from './mockBackend'

const polls = readdirSync(new URL('../fixtures/', import.meta.url)).filter((f) => f.startsWith('full-poll-')).sort().map(fixture)
const FINAL = polls[polls.length - 1]
const RUN = `/dashboard/runs/${FINAL.workflow_id}`

/** Every graph <text>, measured by the browser in viewBox user units, against the viewBox. */
const graphLabelOverflow = (page: Page) =>
  page.locator('svg.nx-graph').evaluate((svg: SVGSVGElement) => {
    const vb = svg.viewBox.baseVal
    return [...svg.querySelectorAll('text')].flatMap((t) => {
      const b = t.getBBox()
      const out = b.x < vb.x || b.y < vb.y || b.x + b.width > vb.x + vb.width || b.y + b.height > vb.y + vb.height
      return out ? [`${t.textContent} [${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.width.toFixed(1)}×${b.height.toFixed(1)}]`] : []
    })
  })

test.describe('knowledge graph labels fit the viewBox with real fonts', () => {
  const FONTS = {
    default: '',
    'Verdana ×1.25': '.nx-graph text { font-family: Verdana, sans-serif !important; font-size: 13.75px !important; }',
  }
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]] as const) {
    for (const [name, css] of Object.entries(FONTS)) {
      test(`${name} font at ${w}×${h}`, async ({ page }) => {
        await mockBackend(page, { runSequence: [FINAL] })
        // The forced font is in place before the app renders, as a user stylesheet or font fallback would be
        if (css) await page.addInitScript((c) => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = c; document.head.append(s) }), css)
        await page.setViewportSize({ width: w, height: h })
        await page.goto(`${RUN}#knowledge`)
        await expect(page.locator('#panel-knowledge')).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        const texts = page.locator('svg.nx-graph text')
        expect(await texts.count()).toBeGreaterThan(0)
        await expect.poll(() => graphLabelOverflow(page)).toEqual([])
        // Full labels remain available as tooltips and in the node list
        const longest = (FINAL.context.knowledge_graph_output.nodes as { label: string }[]).map((n) => n.label).sort((a, b) => b.length - a.length)[0]
        await expect(page.getByRole('list', { name: 'Graph nodes' })).toContainText(longest)
        expect(await page.locator('svg.nx-graph title').allTextContents()).toContain(longest)
      })
    }
  }
})
