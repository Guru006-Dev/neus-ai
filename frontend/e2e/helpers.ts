import type { Page } from '@playwright/test'

export type Snapshot = Record<string, unknown> & { p: number }

declare global {
  interface Window {
    __nexus?: { scrollToProgress(p: number): void; snapshot(): Snapshot }
  }
}

export const SCENE_CHUNK = /Scene3D-[^/]*\.js$/

/** Open the landing page with the debug hook and wait for the 3D scene to report in. */
export async function openLanding(page: Page): Promise<void> {
  await page.goto('/?nexus-debug')
  await page.waitForFunction(() => !!window.__nexus)
  await page.waitForFunction(() => 'camera' in window.__nexus!.snapshot(), undefined, { timeout: 30_000 })
}

/** Poll until two consecutive snapshots are identical: the scrub has settled and a frame has rendered. */
export async function settle(page: Page): Promise<Snapshot> {
  let previous = ''
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(150)
    const current = JSON.stringify(await page.evaluate(() => window.__nexus!.snapshot()))
    if (current === previous) return JSON.parse(current) as Snapshot
    previous = current
  }
  throw new Error('scene did not settle')
}

export async function goToProgress(page: Page, p: number): Promise<Snapshot> {
  await page.evaluate((value) => window.__nexus!.scrollToProgress(value), p)
  return settle(page)
}
