import { expect, test } from '@playwright/test'
import { LID_OPEN } from '../src/landing/scene/constants'
import { phaseAt } from '../src/landing/timeline'
import { SCENE_CHUNK, goToProgress, openLanding, settle } from './helpers'

const PHASE_POINTS = [0, 0.03, 0.08, 0.16, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.93, 0.985]

test('renders every phase (screenshots are a visual reference only)', async ({ page }, info) => {
  // The full phase sequence with a screenshot per phase can exceed 90 s under browser-test overhead.
  test.setTimeout(180_000)
  await openLanding(page)
  for (const p of PHASE_POINTS) {
    const snap = await goToProgress(page, p)
    expect((snap.dom as { phase: string }).phase).toBe(phaseAt(snap.p))
    await page.screenshot({ path: info.outputPath(`phase-${p.toFixed(3)}.png`) })
  }
})

test('the laptop is open with the prompt on screen by the goal phase', async ({ page }) => {
  await openLanding(page)
  const snap = await goToProgress(page, 0.08)
  const laptop = snap.laptop as { lid: number }
  expect(laptop.lid).toBeCloseTo(LID_OPEN, 4)
  expect((snap.dom as { screen: string }).screen).toContain('data-screen="prompt"')
})

test('Test A: scroll determinism — a jump lands on the same state as a direct visit', async ({ page, context }) => {
  await openLanding(page)
  const direct = await goToProgress(page, 0.2)

  const jumper = await context.newPage()
  await openLanding(jumper)
  const at07 = await goToProgress(jumper, 0.7)
  const jumpedBack = await goToProgress(jumper, 0.2)
  expect(jumpedBack).toEqual(direct)

  const fresh = await context.newPage()
  await openLanding(fresh)
  expect(await goToProgress(fresh, 0.7)).toEqual(at07)
})

test('Test B: reverse scroll retraces the forward states exactly', async ({ page }) => {
  // 18 scroll-and-settle steps take ~1.2–1.5 min, right at the 90 s default.
  test.setTimeout(180_000)
  await openLanding(page)
  for (const points of [[0.2, 0.3, 0.4, 0.5, 0.6, 0.7], [0.84, 0.93, 0.985]]) {
    const forward = []
    for (const p of points) forward.push(await goToProgress(page, p))
    const backward = []
    for (const p of [...points].reverse()) backward.push(await goToProgress(page, p))
    expect(backward.reverse()).toEqual(forward)
  }
})

test('3D that finishes loading mid-scroll shows the current state', async ({ page, context }) => {
  await page.route(SCENE_CHUNK, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500))
    await route.continue()
  })
  await page.goto('/?nexus-debug')
  await page.waitForFunction(() => !!window.__nexus)
  await page.evaluate(() => window.__nexus!.scrollToProgress(0.55))
  await page.waitForFunction(() => 'network' in window.__nexus!.snapshot(), undefined, { timeout: 30_000 })
  const late = await settle(page)

  const fresh = await context.newPage()
  await openLanding(fresh)
  expect(late).toEqual(await goToProgress(fresh, 0.55))
})

test('active-agent rule: one agent working, earlier done, later idle', async ({ page }) => {
  await openLanding(page)
  const snap = await goToProgress(page, 0.35)
  expect((snap.network as { statuses: string[] }).statuses).toEqual(['done', 'active', 'idle', 'idle', 'idle', 'idle'])
  await expect(page.locator('.rail__item[aria-current="step"]')).toContainText('Knowledge')
})
