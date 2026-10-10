import { expect, test, type Page } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { fixture, mockBackend } from './mockBackend'

const polls = readdirSync(new URL('../fixtures/', import.meta.url)).filter((f) => f.startsWith('full-poll-')).sort().map(fixture)
const FINAL = polls[polls.length - 1]
const RUN = `/dashboard/runs/${FINAL.workflow_id}`

for (const [w, mode] of [[1440, 'sidebar'], [1024, 'rail'], [390, 'drawer']] as const) {
  test(`shell at ${w}px uses ${mode}`, async ({ page }) => {
    await mockBackend(page, {})
    await page.setViewportSize({ width: w, height: 900 })
    await page.goto('/dashboard')
    await expect(page.locator('.nx-shell')).toHaveAttribute('data-nav', mode)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    if (mode === 'drawer') {
      await page.getByRole('button', { name: 'Open navigation' }).click()
      await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused()
    }
  })
}

const seedRuns = (page: Page) =>
  page.addInitScript((run) => {
    localStorage.setItem('nexus.runs.v1', JSON.stringify({ version: 1, runs: [{ id: run.id, goal: run.goal, submittedAt: '2026-10-03T10:00:00.000Z' }] }))
  }, { id: FINAL.workflow_id as string, goal: FINAL.goal as string })

/** Elements whose right edge passes the viewport, outside the containers allowed to scroll (tab strip, code). */
const overflowing = (page: Page) =>
  page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const allowed = (el: Element) => !!el.closest('.nx-tabs, pre, iframe, dialog:not([open])')
    const out: string[] = []
    for (const el of document.querySelectorAll('.nx-app *')) {
      if (allowed(el)) continue
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.right > vw + 0.5) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} right=${Math.round(r.right)}`)
    }
    return { page: document.documentElement.scrollWidth - innerWidth, elements: out.slice(0, 8) }
  })

const WIDTHS: [number, number][] = [[1440, 900], [1024, 768], [900, 1024], [820, 1180], [390, 844]]
const PAGES = ['/dashboard', '/dashboard/runs', RUN, '/dashboard/agents', '/dashboard/knowledge', '/dashboard/documentation', '/dashboard/qa', '/dashboard/demos', '/dashboard/releases', '/dashboard/settings']
const TABS = ['explorer', 'knowledge', 'documentation', 'qa', 'demo', 'release']

for (const [w, h] of WIDTHS) {
  test(`no horizontal overflow on any page at ${w}×${h}`, async ({ page }) => {
    await mockBackend(page, { runSequence: [FINAL] })
    await seedRuns(page)
    await page.setViewportSize({ width: w, height: h })
    for (const p of PAGES) {
      await page.goto(p)
      await expect(page.locator('h1')).toHaveCount(1)
      if (p === RUN) await expect(page.locator('.nx-runmap')).toBeVisible()
      if (p === '/dashboard/runs') await expect(page.locator('.nx-rows tbody tr')).toHaveCount(1)
      expect(await overflowing(page), `${p} at ${w}px`).toEqual({ page: 0, elements: [] })
    }
    // Every output view of the recorded run
    for (const t of TABS) {
      await page.goto(`${RUN}#${t}`)
      await expect(page.getByRole('tabpanel')).toBeVisible()
      expect(await overflowing(page), `${RUN}#${t} at ${w}px`).toEqual({ page: 0, elements: [] })
    }
  })
}

test('Run Detail is two columns at 1440 and one column at 1199 and below', async ({ page }) => {
  await mockBackend(page, { runSequence: [FINAL] })
  for (const [w, cols] of [[1440, 2], [1199, 1], [1024, 1], [820, 1], [390, 1]] as const) {
    await page.setViewportSize({ width: w, height: 900 })
    await page.goto(RUN)
    const grid = page.locator('.nx-rundetail__cols')
    await expect(grid).toBeVisible()
    const tracks = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean))
    expect(tracks.length, `${w}px`).toBe(cols)
    if (cols === 2) expect(tracks[0]).toBe('360px')
  }
})

test('at 390 the run map is vertical, tables stack and tabs scroll inside their strip', async ({ page }) => {
  await mockBackend(page, { runSequence: [FINAL] })
  await seedRuns(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(RUN)
  await expect(page.locator('.nx-runmap')).toHaveAttribute('data-orientation', 'vertical')
  const strip = page.getByRole('tablist', { name: 'Outputs' })
  const [scrollW, clientW, overflowX] = await strip.evaluate((el) => [el.scrollWidth, el.clientWidth, getComputedStyle(el).overflowX])
  expect(overflowX).toBe('auto')
  expect(scrollW).toBeGreaterThan(clientW) // six tabs do not fit; the strip scrolls rather than the page
  // The last tab is reachable by keyboard and scrolled into view
  await page.getByRole('tab').first().focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tab').last()).toBeFocused()
  await expect(page.getByRole('tab').last()).toBeInViewport()

  await page.goto('/dashboard/runs')
  await expect(page.locator('.nx-rows thead')).toBeHidden()
  await expect(page.locator('.nx-rows tbody tr').first()).toHaveCSS('display', 'grid')
  await page.goto('/dashboard/agents')
  await expect(page.locator('.nx-rows thead')).toBeHidden()

  await page.goto(`${RUN}#explorer`)
  const frame = page.locator('.nx-showcase iframe')
  await expect(frame).toBeVisible()
  const box = (await frame.boundingBox())!
  expect(Math.abs(box.width / box.height - 4 / 3)).toBeLessThan(0.05)
  await expect(page.getByRole('link', { name: 'Open full screen' })).toBeVisible()
})

test('the run map is horizontal at 768 and above', async ({ page }) => {
  await mockBackend(page, { runSequence: [FINAL] })
  for (const w of [1440, 1024, 768]) {
    await page.setViewportSize({ width: w, height: 900 })
    await page.goto(RUN)
    await expect(page.locator('.nx-runmap'), `${w}px`).toHaveAttribute('data-orientation', 'horizontal')
  }
})

test.describe('tablet rail', () => {
  for (const [w, h] of [[1024, 768], [900, 1024], [820, 1180]] as const) {
    test(`expands as an overlay and closes with Esc at ${w}×${h}`, async ({ page }) => {
      await mockBackend(page, {})
      await page.setViewportSize({ width: w, height: h })
      await page.goto('/dashboard')
      const main = page.locator('main')
      const before = (await main.boundingBox())!
      const toggle = page.getByRole('button', { name: 'Expand navigation' })
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await toggle.click()
      const collapse = page.getByRole('button', { name: 'Collapse navigation' })
      await expect(collapse).toHaveAttribute('aria-expanded', 'true')
      const nav = page.getByRole('navigation', { name: 'Dashboard' })
      await expect(nav.getByRole('link', { name: 'Runs', exact: true })).toHaveText('Runs')
      await expect.poll(async () => (await nav.boundingBox())!.width).toBe(232)
      // Overlay: content does not reflow
      expect((await main.boundingBox())!.x).toBe(before.x)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeFocused()
      await expect(page.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute('aria-expanded', 'false')
      expect((await nav.boundingBox())!.width).toBe(56)
    })
  }

  test('expansion animates paint properties, never width', async ({ page }) => {
    await mockBackend(page, {})
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard')
    const nav = page.locator('.nx-side__nav')
    const props = () => nav.evaluate((el) => {
      const s = getComputedStyle(el)
      // transition-property defaults to `all` with a 0s duration; only a running duration counts
      const moving = s.transitionDuration.split(',').some((d) => parseFloat(d) > 0)
      return { transition: moving ? s.transitionProperty : 'none', animation: s.animationName }
    })
    const collapsed = await props()
    expect(collapsed.transition).not.toMatch(/width|all/)
    await page.getByRole('button', { name: 'Expand navigation' }).click()
    const open = await props()
    expect(open.transition).not.toMatch(/width|all/)
    expect(open.animation).toBe('nx-rail-reveal')
    const keyframes = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSKeyframesRule && rule.name === 'nx-rail-reveal') return rule.cssText
        }
      }
      return ''
    })
    expect(keyframes).toMatch(/clip-path|transform|opacity/)
    expect(keyframes).not.toMatch(/\bwidth\b|\bleft\b|padding|margin/)
  })

  test('an expanded rail does not come back expanded after visiting another mode', async ({ page }) => {
    await mockBackend(page, {})
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Expand navigation' }).click()
    await expect(page.getByRole('button', { name: 'Collapse navigation' })).toBeVisible()
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.locator('.nx-shell')).toHaveAttribute('data-nav', 'sidebar')
    await page.setViewportSize({ width: 1024, height: 768 })
    await expect(page.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute('aria-expanded', 'false')
  })
})
