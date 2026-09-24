import { expect, test } from '@playwright/test'
import { LID_OPEN } from '../src/landing/scene/constants'
import { phaseAt } from '../src/landing/timeline'
import { goToProgress, openLanding } from './helpers'

const PHASE_POINTS = [0, 0.03, 0.08, 0.16, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.93, 0.985]

test('renders every phase (screenshots are a visual reference only)', async ({ page }, info) => {
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
