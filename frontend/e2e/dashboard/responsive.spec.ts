import { expect, test } from '@playwright/test'
import { mockBackend } from './mockBackend'

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
