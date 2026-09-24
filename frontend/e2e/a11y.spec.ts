import { expect, test, type Page } from '@playwright/test'
import { goToProgress, openLanding } from './helpers'

async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? ''
  })
}

test('keyboard order reaches nav and hero CTA; the faded intro CTA leaves the tab order', async ({ page }) => {
  await openLanding(page)
  const names: string[] = []
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab')
    names.push(await focusedName(page))
  }
  expect(names).toEqual(['NEXUS home', 'How it works', 'API', 'Launch NEXUS', 'Launch NEXUS'])

  await goToProgress(page, 0.5)
  await expect(page.locator('.intro a')).toBeHidden()
  await page.locator('.nav__cta').focus()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('.intro'))).toBe(false)
})

test('captions stay quiet, the canvas is hidden from assistive tech, the rail marks the current step', async ({ page }) => {
  await openLanding(page)
  await goToProgress(page, 0.35)
  await expect(page.locator('.caption')).not.toHaveAttribute('aria-live', /.+/)
  await expect(page.locator('.scene')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('.rail__item[aria-current="step"]')).toContainText('Knowledge')
})

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 2560, height: 1440 },
]) {
  test(`fits ${viewport.width}×${viewport.height}: no overflow, caption and rail apart`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await openLanding(page)
    await goToProgress(page, 0.35)
    const layout = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)!.getBoundingClientRect()
      const c = box('.caption')
      const r = box('.rail')
      const overlap = c.left < r.right && r.left < c.right && c.top < r.bottom && r.top < c.bottom
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, overlap }
    })
    expect(layout.overflow).toBeLessThanOrEqual(0)
    expect(layout.overlap).toBe(false)
  })
}
