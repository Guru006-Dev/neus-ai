import { expect, test } from '@playwright/test'

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('renders the full 2D story instead of WebGL', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.fallback')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.locator('.fallback__step')).toHaveCount(9)
    await expect(page.locator('.fallback [data-screen]')).toHaveCount(8)
    await expect(page.locator('.fallback__finale').getByRole('link', { name: 'Launch NEXUS' })).toHaveAttribute(
      'href',
      '/dashboard',
    )
  })
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('uses the fallback with no horizontal overflow', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.fallback')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test('crossing 768px switches cleanly between 3D and the fallback', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 30_000 })

  await page.setViewportSize({ width: 700, height: 800 })
  await expect(page.locator('.fallback')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)

  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 30_000 })
})

test('3D mounting on an already-scrolled page shows the current state, not the start', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 })
  await page.goto('/?nexus-debug')
  await expect(page.locator('.fallback')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 3000))
  await page.setViewportSize({ width: 1366, height: 800 })
  await page.waitForFunction(() => !!window.__nexus)
  await page.waitForFunction(() => {
    const [scrubbed, exact] = window.__nexus!.progressPair()
    return exact > 0.1 && scrubbed === exact
  }, undefined, { timeout: 10_000 })
  await expect(page.locator('.intro')).toHaveCSS('visibility', 'hidden')
})
