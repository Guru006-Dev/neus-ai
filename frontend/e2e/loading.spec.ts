import { expect, test } from '@playwright/test'
import { SCENE_CHUNK } from './helpers'

test('headline, nav and CTA are usable before the 3D chunk arrives', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(SCENE_CHUNK, async (route) => {
    await gate
    await route.continue()
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.nav')).toBeVisible()
  const cta = page.getByRole('link', { name: 'Launch NEXUS' }).first()
  await expect(cta).toBeVisible()
  await cta.focus()
  await expect(cta).toBeFocused()
  await expect(page.locator('canvas')).toHaveCount(0)

  release()
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 30_000 })
})

test('a failed 3D chunk falls back to the 2D sequence', async ({ page }) => {
  await page.route(SCENE_CHUNK, (route) => route.abort())
  await page.goto('/')
  await expect(page.locator('.fallback')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
