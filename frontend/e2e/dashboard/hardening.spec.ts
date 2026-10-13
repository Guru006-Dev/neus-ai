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

/** Whether the focused element is hit-tested at its own centre (not covered by an overlay; WCAG 2.4.11). */
const focusedIsUnobscured = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null
    if (!a || a === document.body) return { ok: false, what: 'nothing focused' }
    const r = a.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return { ok: !!hit && (hit === a || a.contains(hit)), what: `${a.tagName} "${a.textContent?.trim().slice(0, 30)}" hit=${hit?.className}` }
  })

test.describe('tablet rail overlay never hides focus', () => {
  for (const [w, h] of [[1024, 768], [820, 1180]] as const) {
    test(`tabbing out of the expanded rail collapses it at ${w}×${h}`, async ({ page }) => {
      await mockBackend(page, { runSequence: [FINAL] })
      await page.setViewportSize({ width: w, height: h })
      await page.goto(RUN)
      await expect(page.locator('h1')).toHaveCount(1)
      await page.getByRole('button', { name: 'Expand navigation' }).click()
      const nav = page.getByRole('navigation', { name: 'Dashboard' })
      // Let the 180 ms reveal finish: mid-animation the clip-path still exposes the content underneath
      await nav.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
      await nav.getByRole('link', { name: 'Settings' }).focus()
      // Walk forward out of the sidebar, through the top bar and into main; every stop must be visible
      const stops: string[] = []
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab')
        const where = await page.evaluate(() => (document.activeElement?.closest('.nx-side') ? 'side' : document.activeElement?.closest('main') ? 'main' : 'other'))
        if (where === 'side') continue
        const r = await focusedIsUnobscured(page)
        if (!r.ok) stops.push(r.what)
        if (where === 'main') break
      }
      expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true)
      expect(stops, 'focused elements covered by the rail overlay').toEqual([])
      await expect(page.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute('aria-expanded', 'false')
    })
  }

  test('pointerdown outside the expanded rail collapses it', async ({ page }) => {
    await mockBackend(page, {})
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Expand navigation' }).click()
    await expect(page.getByRole('button', { name: 'Collapse navigation' })).toHaveAttribute('aria-expanded', 'true')
    await page.mouse.click(900, 600)
    await expect(page.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute('aria-expanded', 'false')
    expect((await page.locator('.nx-side__nav').boundingBox())!.width).toBe(56)
  })

  test('moving focus within the rail keeps it open; Esc collapses and returns focus to the toggle', async ({ page }) => {
    await mockBackend(page, {})
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Expand navigation' }).click()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Collapse navigation' })).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    const toggle = page.getByRole('button', { name: 'Expand navigation' })
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  test('clicking a nav item in the expanded rail navigates and collapses', async ({ page }) => {
    await mockBackend(page, {})
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Expand navigation' }).click()
    await page.getByRole('navigation', { name: 'Dashboard' }).getByRole('link', { name: 'Runs', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/runs$/)
    await expect(page.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute('aria-expanded', 'false')
  })
})

const drawerMotion = (page: Page) =>
  page.getByRole('dialog', { name: 'Navigation' }).evaluate((el) => {
    const s = getComputedStyle(el)
    return {
      property: s.transitionProperty,
      duration: Math.max(...s.transitionDuration.split(',').map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 0.001 : 1))),
      animation: s.animationName,
      transform: s.transform,
      running: el.getAnimations().map((a) => (a as CSSTransition).transitionProperty ?? (a as CSSAnimation).animationName),
    }
  })

const openDrawer = async (page: Page) => {
  await mockBackend(page, {})
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible()
}

test.describe('phone drawer slide', () => {
  test.describe('no-preference', () => {
    test.use({ reducedMotion: 'no-preference' })
    test('slides in with a transform transition of at most 200 ms and settles at identity', async ({ page }) => {
      await openDrawer(page)
      const start = await drawerMotion(page)
      expect(start.property).toBe('transform')
      expect(start.duration).toBeGreaterThan(0)
      expect(start.duration).toBeLessThanOrEqual(0.2)
      expect(start.animation).toBe('none')
      expect(start.running).toEqual(['transform']) // the entry transition actually ran
      await expect.poll(async () => (await drawerMotion(page)).transform).toBe('none')
      await expect.poll(async () => (await drawerMotion(page)).running).toEqual([])
    })
    test('still traps focus, closes with Esc and returns focus to the trigger', async ({ page }) => {
      await openDrawer(page)
      for (let i = 0; i < 16; i++) {
        await page.keyboard.press('Tab')
        // Focus may cycle through the browser chrome (body), but never to page content behind the modal
        const outside = await page.evaluate(() => { const a = document.activeElement; return !!a && a !== document.body && !a.closest('dialog') })
        expect(outside, `Tab ${i + 1} left the drawer`).toBe(false)
      }
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeHidden()
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused()
    })
  })
  test.describe('reduce', () => {
    test.use({ reducedMotion: 'reduce' })
    test('opens with no transition or animation', async ({ page }) => {
      await openDrawer(page)
      const m = await drawerMotion(page)
      expect(m.duration).toBe(0)
      expect(m.animation).toBe('none')
      expect(m.transform).toBe('none')
      expect(m.running).toEqual([])
    })
  })
})
