import { expect, test } from '@playwright/test'

const DASH_CHUNK = /NexusDashboard-[^/]*\.js$/

test('the landing page never downloads dashboard code', async ({ page }) => {
  const chunks: string[] = []
  page.on('request', (r) => chunks.push(r.url()))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(chunks.some((u) => DASH_CHUNK.test(u))).toBe(false)
})

test('Launch NEXUS opens the dashboard', async ({ page }) => {
  await page.goto('/')
  await page.locator('.nav__cta').click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.locator('.nx-app')).toBeVisible()
})

test('deep links resolve inside the dashboard', async ({ page }) => {
  for (const path of ['/dashboard/runs', '/dashboard/runs/wf-12345678', '/dashboard/agents', '/dashboard/settings', '/dashboard/nope']) {
    await page.goto(path)
    await expect(page.locator('.nx-app'), path).toBeVisible()
  }
})
